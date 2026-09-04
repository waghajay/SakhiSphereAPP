import { getPool } from '../config/database';

export interface Interest {
  id: number;
  name: string;
  category: string;
  icon: string | null;
}

export class InterestsService {
  /**
   * Retrieves all available system interests.
   */
  static async getAllInterests(): Promise<Interest[]> {
    const pool = getPool();
    const [rows]: any = await pool.query('SELECT id, name, category, icon FROM interests ORDER BY category, name ASC');
    return rows;
  }

  /**
   * Retrieves interests selected by a specific user.
   */
  static async getUserInterests(userId: number): Promise<Interest[]> {
    const pool = getPool();
    const [rows]: any = await pool.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = ?
       ORDER BY i.category, i.name ASC`,
      [userId]
    );
    return rows;
  }

  /**
   * Sets or updates user interests relationally.
   */
  static async setUserInterests(userId: number, interestIds: number[]): Promise<Interest[]> {
    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Clear previous user interests
      await connection.query('DELETE FROM user_interests WHERE user_id = ?', [userId]);

      // Insert new selections
      if (interestIds && interestIds.length > 0) {
        // Filter unique IDs
        const uniqueIds = Array.from(new Set(interestIds));
        const values = uniqueIds.map((id) => [userId, id]);

        await connection.query(
          'INSERT INTO user_interests (user_id, interest_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      return this.getUserInterests(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
