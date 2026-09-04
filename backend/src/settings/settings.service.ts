import bcrypt from 'bcryptjs';
import { getPool } from '../config/database';

export interface NotificationSettingsDto {
  push_notifications?: boolean;
  email_notifications?: boolean;
  chat_notifications?: boolean;
  community_updates?: boolean;
}

export interface PrivacySettingsDto {
  privacy_profile_visibility?: 'public' | 'members_only' | 'connections_only';
  privacy_allow_messages?: 'all_members' | 'connections_only';
  privacy_show_online_status?: boolean;
}

export class SettingsService {
  /**
   * Retrieves all user settings (notifications and privacy).
   */
  static async getSettings(userId: number) {
    const pool = getPool();

    // 1. Get Notification Settings
    const [notifRows]: any = await pool.query(
      'SELECT push_notifications, email_notifications, chat_notifications, community_updates FROM user_settings WHERE user_id = ?',
      [userId]
    );

    // If not exists, insert default
    let notifications = notifRows[0];
    if (!notifications) {
      await pool.query('INSERT IGNORE INTO user_settings (user_id) VALUES (?)', [userId]);
      notifications = {
        push_notifications: true,
        email_notifications: true,
        chat_notifications: true,
        community_updates: true,
      };
    }

    // 2. Get Privacy Settings from profile
    const [profileRows]: any = await pool.query(
      'SELECT privacy_profile_visibility, privacy_allow_messages, privacy_show_online_status FROM profiles WHERE user_id = ?',
      [userId]
    );

    const privacy = profileRows[0] || {
      privacy_profile_visibility: 'members_only',
      privacy_allow_messages: 'all_members',
      privacy_show_online_status: true,
    };

    return {
      notifications: {
        pushNotifications: Boolean(notifications.push_notifications),
        emailNotifications: Boolean(notifications.email_notifications),
        chatNotifications: Boolean(notifications.chat_notifications),
        communityUpdates: Boolean(notifications.community_updates),
      },
      privacy: {
        profileVisibility: privacy.privacy_profile_visibility || 'members_only',
        allowMessages: privacy.privacy_allow_messages || 'all_members',
        showOnlineStatus: Boolean(privacy.privacy_show_online_status),
      },
    };
  }

  /**
   * Updates notification preferences.
   */
  static async updateNotifications(userId: number, data: NotificationSettingsDto) {
    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.push_notifications !== undefined) {
      updates.push('push_notifications = ?');
      values.push(data.push_notifications);
    }
    if (data.email_notifications !== undefined) {
      updates.push('email_notifications = ?');
      values.push(data.email_notifications);
    }
    if (data.chat_notifications !== undefined) {
      updates.push('chat_notifications = ?');
      values.push(data.chat_notifications);
    }
    if (data.community_updates !== undefined) {
      updates.push('community_updates = ?');
      values.push(data.community_updates);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    return this.getSettings(userId);
  }

  /**
   * Updates privacy controls.
   */
  static async updatePrivacy(userId: number, data: PrivacySettingsDto) {
    const pool = getPool();
    const updates: string[] = [];
    const values: any[] = [];

    if (data.privacy_profile_visibility !== undefined) {
      updates.push('privacy_profile_visibility = ?');
      values.push(data.privacy_profile_visibility);
    }
    if (data.privacy_allow_messages !== undefined) {
      updates.push('privacy_allow_messages = ?');
      values.push(data.privacy_allow_messages);
    }
    if (data.privacy_show_online_status !== undefined) {
      updates.push('privacy_show_online_status = ?');
      values.push(data.privacy_show_online_status);
    }

    if (updates.length > 0) {
      values.push(userId);
      await pool.query(
        `UPDATE profiles SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    return this.getSettings(userId);
  }

  /**
   * Securely changes user password.
   */
  static async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const pool = getPool();

    const [rows]: any = await pool.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (rows.length === 0) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      const error: any = new Error('Incorrect current password');
      error.statusCode = 400;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return { success: true, message: 'Password updated successfully' };
  }
}
