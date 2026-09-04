import { getPrisma } from '../config/database';
import { CustomError } from '../middleware/errorHandler';
import { Prisma, PostVisibility, MediaType } from '@prisma/client';
import { CloudinaryService } from '../services/cloudinary.service';

export interface CreatePostDto {
  content: string;
  mediaUrls?: string[];
  mediaTypes?: MediaType[];
  visibility?: PostVisibility;
}

export interface UpdatePostDto {
  content?: string;
  mediaUrls?: string[];
  mediaTypes?: MediaType[];
  visibility?: PostVisibility;
}

export interface FeedOptions {
  page?: number;
  limit?: number;
  sortBy?: 'recent' | 'popular' | 'following' | 'interests';
}

export class PostsService {
  /**
   * Creates a new post.
   */
  static async createPost(userId: number, data: CreatePostDto) {
    const prisma = getPrisma();

    if (!data.content || !data.content.trim()) {
      throw new CustomError('Post content is required', 400);
    }

    if (data.content.length > 5000) {
      throw new CustomError('Post content must be less than 5000 characters', 400);
    }

    if (data.mediaUrls && data.mediaTypes) {
      if (data.mediaUrls.length !== data.mediaTypes.length) {
        throw new CustomError('Media URLs and types must match', 400);
      }
    }

    if (data.mediaUrls && data.mediaUrls.length > 4) {
      throw new CustomError('Maximum 4 media items allowed per post', 400);
    }

    const post = await prisma.post.create({
      data: {
        userId,
        content: data.content.trim(),
        mediaUrls: data.mediaUrls || [],
        mediaTypes: data.mediaTypes || [],
        visibility: data.visibility || 'public',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return this.formatPost(post);
  }

  /**
   * Gets the feed for a user with advanced algorithm.
   */
/**
   * Gets the feed with advanced ranking algorithm.
   */
  static async getFeed(
    userId: number,
    options: FeedOptions = {}
  ) {
    const prisma = getPrisma();
    const { page = 1, limit = 10, sortBy = 'recent' } = options;
    const skip = (page - 1) * limit;

    // Get user's following list
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map(f => f.followingId);

    // Get blocked users
    const blockedUsers = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });

    const blockedIds = blockedUsers.map(b => b.blockedId);

    // Get user's interests
    const userInterests = await prisma.userInterest.findMany({
      where: { userId },
      select: { interestId: true },
    });

    const interestIds = userInterests.map(ui => ui.interestId);

    let posts;
    let total;

    switch (sortBy) {
      case 'popular':
        // Fetch with engagement data for scoring
        const popularPosts = await prisma.post.findMany({
          where: {
            userId: {
              in: [userId, ...followingIds],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: { select: { avatarUrl: true } },
              },
            },
            likes: { where: { userId }, select: { id: true } },
            _count: {
              select: { likes: true, comments: true },
            },
          },
        });

        // Calculate engagement score
        const scoredPosts = popularPosts.map(post => {
          const likesScore = post._count.likes * 2;
          const commentsScore = post._count.comments * 3;
          const engagementScore = likesScore + commentsScore;
          
          // Time decay: newer posts get higher score
          const hoursSincePosted = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);
          const timeFactor = 1 / (1 + hoursSincePosted);
          
          const finalScore = engagementScore * timeFactor;
          
          return { post, finalScore };
        });

        // Sort by score
        scoredPosts.sort((a, b) => b.finalScore - a.finalScore);
        
        // Paginate
        total = scoredPosts.length;
        posts = scoredPosts.slice(skip, skip + limit).map(s => s.post);
        break;

      case 'following':
        // Only posts from followed users
        const followingPosts = await prisma.post.findMany({
          where: {
            userId: {
              in: followingIds.length > 0 ? followingIds : [userId],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: { select: { avatarUrl: true } },
              },
            },
            likes: { where: { userId }, select: { id: true } },
            _count: {
              select: { likes: true, comments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });
        
        total = await prisma.post.count({
          where: {
            userId: {
              in: followingIds.length > 0 ? followingIds : [userId],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
        });
        
        posts = followingPosts;
        break;

      case 'interests':
        // Find users with similar interests
        let similarUserIds: number[] = [];
        
        if (interestIds.length > 0) {
          const usersWithSimilarInterests = await prisma.userInterest.findMany({
            where: {
              interestId: { in: interestIds },
              userId: { 
                not: userId,
                notIn: blockedIds,
              },
            },
            select: {
              userId: true,
              interestId: true,
            },
            distinct: ['userId', 'interestId'],
            take: 50,
          });

          // Calculate similarity score for each user
          const userScores = new Map<number, number>();
          
          for (const ui of usersWithSimilarInterests) {
            const currentScore = userScores.get(ui.userId) || 0;
            userScores.set(ui.userId, currentScore + 1);
          }

          // Sort users by similarity score
          const sortedUsers = Array.from(userScores.entries())
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

          similarUserIds = sortedUsers.slice(0, 20);
        }

        const targetUserIds = [...new Set([...similarUserIds, ...followingIds])];
        
        const interestPosts = await prisma.post.findMany({
          where: {
            userId: {
              in: targetUserIds.length > 0 ? targetUserIds : [userId],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: { select: { avatarUrl: true } },
              },
            },
            likes: { where: { userId }, select: { id: true } },
            _count: {
              select: { likes: true, comments: true },
            },
          },
          orderBy: [
            { likes: { _count: 'desc' } },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        });

        total = await prisma.post.count({
          where: {
            userId: {
              in: targetUserIds.length > 0 ? targetUserIds : [userId],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
        });

        posts = interestPosts;
        break;

      case 'recent':
      default:
        // Simple chronological feed
        posts = await prisma.post.findMany({
          where: {
            userId: {
              in: [userId, ...followingIds],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                isVerified: true,
                profile: { select: { avatarUrl: true } },
              },
            },
            likes: { where: { userId }, select: { id: true } },
            _count: {
              select: { likes: true, comments: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        });

        total = await prisma.post.count({
          where: {
            userId: {
              in: [userId, ...followingIds],
              notIn: blockedIds,
            },
            visibility: { in: ['public', 'members_only'] },
          },
        });
        break;
    }

    return {
      posts: posts.map(post => this.formatPost(post, userId)),
      feedType: sortBy,
      feedExplanation: this.getFeedExplanation(sortBy),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }


 /**
   * Returns explanation for each feed type.
   */
  private static getFeedExplanation(sortBy: string): string {
    switch (sortBy) {
      case 'popular':
        return 'Posts ranked by engagement (likes + comments) with recent posts boosted';
      case 'following':
        return 'Posts from people you follow, newest first';
      case 'interests':
        return 'Posts from users with similar interests to yours';
      case 'recent':
      default:
        return 'Newest posts from your network';
    }
  }


  /**
   * Gets a single post by ID.
   */
  static async getPost(postId: number, userId?: number) {
    const prisma = getPrisma();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: {
              select: {
                avatarUrl: true,
                bio: true,
              },
            },
          },
        },
        likes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    return this.formatPost(post, userId);
  }

  /**
   * Updates a post with media management.
   */
  static async updatePost(postId: number, userId: number, data: UpdatePostDto) {
    const prisma = getPrisma();

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    if (post.userId !== userId) {
      throw new CustomError('You can only edit your own posts', 403);
    }

    const updateData: Prisma.PostUpdateInput = {};

    if (data.content !== undefined) {
      if (!data.content.trim()) {
        throw new CustomError('Post content cannot be empty', 400);
      }
      if (data.content.length > 5000) {
        throw new CustomError('Post content must be less than 5000 characters', 400);
      }
      updateData.content = data.content.trim();
    }

    if (data.mediaUrls !== undefined) {
      if (data.mediaUrls.length > 4) {
        throw new CustomError('Maximum 4 media items allowed', 400);
      }
      updateData.mediaUrls = data.mediaUrls;
    }

    if (data.mediaTypes !== undefined) {
      updateData.mediaTypes = data.mediaTypes;
    }

    if (data.visibility !== undefined) {
      updateData.visibility = data.visibility;
    }

    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            isVerified: true,
            profile: {
              select: {
                avatarUrl: true,
              },
            },
          },
        },
        likes: {
          where: { userId },
          select: { id: true },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    return this.formatPost(updatedPost, userId);
  }

  /**
   * Deletes a post with cleanup.
   */
  static async deletePost(postId: number, userId: number) {
    const prisma = getPrisma();

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new CustomError('Post not found', 404);
    }

    if (post.userId !== userId) {
      throw new CustomError('You can only delete your own posts', 403);
    }

    if (post.mediaUrls && post.mediaUrls.length > 0) {
      for (const url of post.mediaUrls) {
        try {
          const publicId = this.extractPublicIdFromUrl(url);
          if (publicId) {
            await CloudinaryService.deleteFile(publicId);
          }
        } catch (error) {
          console.error('Failed to delete media:', error);
        }
      }
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  /**
   * Helper to extract public ID from Cloudinary URL.
   */
  private static extractPublicIdFromUrl(url: string): string | null {
    try {
      const urlParts = url.split('/');
      const uploadIndex = urlParts.indexOf('upload');
      
      if (uploadIndex !== -1 && uploadIndex + 2 < urlParts.length) {
        const relevantParts = urlParts.slice(uploadIndex + 2);
        const lastPart = relevantParts[relevantParts.length - 1];
        const lastPartWithoutExt = lastPart.split('.')[0];
        relevantParts[relevantParts.length - 1] = lastPartWithoutExt;
        return relevantParts.join('/');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to extract public ID:', error);
      return null;
    }
  }

  /**
   * Gets posts by a specific user.
   */
  static async getUserPosts(
    userId: number,
    page: number = 1,
    limit: number = 10,
    currentUserId?: number
  ) {
    const prisma = getPrisma();
    const skip = (page - 1) * limit;

    if (currentUserId) {
      const block = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: currentUserId },
            { blockerId: currentUserId, blockedId: userId },
          ],
        },
      });

      if (block) {
        return {
          posts: [],
          pagination: {
            page,
            limit,
            total: 0,
            totalPages: 0,
            hasMore: false,
          },
        };
      }
    }

    const where: Prisma.PostWhereInput = {
      userId,
      visibility: 'public',
    };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              isVerified: true,
              profile: {
                select: {
                  avatarUrl: true,
                },
              },
            },
          },
          likes: currentUserId ? {
            where: { userId: currentUserId },
            select: { id: true },
          } : false,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.post.count({ where }),
    ]);

    return {
      posts: posts.map(post => this.formatPost(post, currentUserId)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  /**
   * Helper method to format post response.
   */
  private static formatPost(post: any, userId?: number) {
    const likes = post.likes || [];
    const likedByMe = userId ? likes.some((like: any) => like.userId === userId) : false;

    return {
      id: post.id,
      content: post.content,
      mediaUrls: post.mediaUrls,
      mediaTypes: post.mediaTypes,
      visibility: post.visibility,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.user ? {
        id: post.user.id,
        name: post.user.name,
        isVerified: post.user.isVerified,
        avatarUrl: post.user.profile?.avatarUrl || null,
      } : null,
      likesCount: post._count?.likes || 0,
      commentsCount: post._count?.comments || 0,
      likedByMe,
    };
  }
}