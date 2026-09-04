import { getPool } from '../config/database';

export interface SubmitVerificationDto {
  verification_type: 'id_proof' | 'student_id' | 'work_id' | 'social_profile';
  document_note?: string;
  document_url?: string;
  autoApprove?: boolean; // For college demo / testing
}

export class VerificationService {
  /**
   * Retrieves user verification status and submission history.
   */
  static async getStatus(userId: number) {
    const pool = getPool();

    // Check is_verified flag on user
    const [userRows]: any = await pool.query(
      'SELECT id, name, email, is_verified, is_email_verified, is_phone_verified FROM users WHERE id = ?',
      [userId]
    );

    if (userRows.length === 0) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const user = userRows[0];

    // Get latest request
    const [requestRows]: any = await pool.query(
      `SELECT id, status, verification_type, document_note, document_url, admin_notes, submitted_at, reviewed_at
       FROM verification_requests
       WHERE user_id = ?
       ORDER BY submitted_at DESC LIMIT 1`,
      [userId]
    );

    const latestRequest = requestRows.length > 0 ? requestRows[0] : null;

    return {
      isVerified: Boolean(user.is_verified),
      isEmailVerified: Boolean(user.is_email_verified),
      isPhoneVerified: Boolean(user.is_phone_verified),
      latestRequest,
    };
  }

  /**
   * Submits a new verification request.
   */
  static async submitRequest(userId: number, data: SubmitVerificationDto) {
    const pool = getPool();

    // Check if already verified
    const [userRows]: any = await pool.query('SELECT is_verified FROM users WHERE id = ?', [userId]);
    if (userRows[0]?.is_verified) {
      const error: any = new Error('Your profile is already verified with a SakhiSphere Verified Badge! 🌸');
      error.statusCode = 400;
      throw error;
    }

    // Check if already has a pending request
    const [pendingRows]: any = await pool.query(
      "SELECT id FROM verification_requests WHERE user_id = ? AND status = 'pending'",
      [userId]
    );

    if (pendingRows.length > 0) {
      const error: any = new Error('You already have a verification request pending review.');
      error.statusCode = 409;
      throw error;
    }

    // If autoApprove flag is set (useful for demonstration in college project)
    const initialStatus = data.autoApprove ? 'approved' : 'pending';

    const [result]: any = await pool.query(
      `INSERT INTO verification_requests (user_id, status, verification_type, document_note, document_url, reviewed_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        initialStatus,
        data.verification_type,
        data.document_note || 'Self-submitted profile verification',
        data.document_url || null,
        data.autoApprove ? new Date() : null,
      ]
    );

    if (data.autoApprove) {
      await pool.query('UPDATE users SET is_verified = TRUE WHERE id = ?', [userId]);
    }

    return {
      requestId: result.insertId,
      status: initialStatus,
      isVerified: Boolean(data.autoApprove),
      message: data.autoApprove
        ? 'Profile verified successfully! Verified badge awarded 🌸'
        : 'Verification request submitted. Our safety team will review it shortly.',
    };
  }
}
