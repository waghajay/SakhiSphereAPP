import * as FileSystem from "expo-file-system/legacy";

const CACHE_DIR = `${FileSystem.cacheDirectory}media/`;

interface CacheEntry {
  url: string;
  localPath: string;
  timestamp: number;
}

class MediaCacheService {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize = 100;
  private maxCacheAge = 7 * 24 * 60 * 60 * 1000; // 7 days
  private initialized = false;

  constructor() {
    // Don't initialize in constructor to avoid issues
  }

  private async ensureInitialized() {
    if (this.initialized) return;

    try {
      const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
      }
      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize media cache:", error);
      // Don't throw - just continue without caching
    }
  }

  async getCachedMedia(url: string): Promise<string | null> {
    await this.ensureInitialized();

    // Check memory cache first
    const memoryEntry = this.cache.get(url);
    if (memoryEntry && Date.now() - memoryEntry.timestamp < this.maxCacheAge) {
      return memoryEntry.localPath;
    }

    // Check disk cache
    const fileName = this.getFileName(url);
    const filePath = `${CACHE_DIR}${fileName}`;

    try {
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        this.cache.set(url, {
          url,
          localPath: filePath,
          timestamp: Date.now(),
        });
        return filePath;
      }
    } catch (error) {
      console.error("Failed to check disk cache:", error);
    }

    return null;
  }

  async cacheMedia(url: string, localPath: string): Promise<void> {
    await this.ensureInitialized();

    this.cache.set(url, {
      url,
      localPath,
      timestamp: Date.now(),
    });

    const fileName = this.getFileName(url);
    const filePath = `${CACHE_DIR}${fileName}`;

    try {
      await FileSystem.copyAsync({
        from: localPath,
        to: filePath,
      });
    } catch (error) {
      console.error("Failed to cache media:", error);
    }

    this.cleanupCache();
  }

  private getFileName(url: string): string {
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return `media_${Math.abs(hash)}.cache`;
  }

  private async cleanupCache() {
    try {
      const files = await FileSystem.readDirectoryAsync(CACHE_DIR);

      if (files.length > this.maxCacheSize) {
        files.sort();
        const filesToDelete = files.slice(0, files.length - this.maxCacheSize);
        for (const file of filesToDelete) {
          await FileSystem.deleteAsync(`${CACHE_DIR}${file}`, {
            idempotent: true,
          });
        }
      }
    } catch (error) {
      console.error("Failed to cleanup cache:", error);
    }
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    try {
      await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  }
}

export const mediaCache = new MediaCacheService();
