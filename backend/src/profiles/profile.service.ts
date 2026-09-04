import { getPool } from '../config/database';
import { AuthService } from '../auth/auth.service';

export interface UpdateProfileDto {
  name?: string;
  bio?: string;
  location?: string;
  occupation?: string;
  avatar_url?: string;
}

export class ProfileService {
  /**
   * Retrieves the full profile of a user.
   */
  static async getProfile(userId: number) {
    return AuthService.getProfile(userId);
  }

  /**
   * Updates user profile details (name in users table, bio/location/etc. in profiles table).
   */
  static async updateProfile(userId: number, data: UpdateProfileDto) {
    const pool = getPool();

    // 1. Update name if provided
    if (data.name && data.name.trim()) {
      await pool.query('UPDATE users SET name = ? WHERE id = ?', [data.name.trim(), userId]);
    }

    // 2. Update profile table fields
    const updates: string[] = [];
    const values: any[] = [];

    if (data.bio !== undefined) {
      updates.push('bio = ?');
      values.push(data.bio);
    }
    if (data.location !== undefined) {
      updates.push('location = ?');
      values.push(data.location);
    }
    if (data.occupation !== undefined) {
      updates.push('occupation = ?');
      values.push(data.occupation);
    }
    if (data.avatar_url !== undefined) {
      updates.push('avatar_url = ?');
      values.push(data.avatar_url);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    return AuthService.getProfile(userId);
  }

  /**
   * Gets a public profile of another user respecting privacy settings.
   */
  static async getPublicProfile(targetUserId: number) {
    const pool = getPool();
    const [rows]: any = await pool.query(
      `SELECT u.id, u.name, u.is_verified, u.created_at,
              p.bio, p.avatar_url, p.location, p.occupation,
              p.privacy_profile_visibility, p.privacy_allow_messages, p.privacy_show_online_status
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`,
      [targetUserId]
    );

    if (rows.length === 0) {
      const error: any = new Error('Member profile not found');
      error.statusCode = 404;
      throw error;
    }

    const member = rows[0];

    // Fetch member's interests
    const [interests]: any = await pool.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = ?`,
      [targetUserId]
    );

    return {
      id: member.id,
      name: member.name,
      bio: member.bio,
      avatar_url: member.avatar_url,
      location: member.location,
      occupation: member.occupation,
      is_verified: Boolean(member.is_verified),
      joinedDate: member.created_at,
      interests: interests || [],
      privacy: {
        profileVisibility: member.privacy_profile_visibility,
        allowMessages: member.privacy_allow_messages,
      },
    };
  }
}
