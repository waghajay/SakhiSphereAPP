import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getPool } from '../config/database';
import { env } from '../config/env';

export interface UserRow extends RowDataPacket {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  password_hash: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  is_verified: boolean;
  created_at: string;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  occupation?: string | null;
}

export interface SanitizedUser {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  location?: string | null;
  occupation?: string | null;
  is_email_verified: boolean;
  is_verified: boolean;
  createdAt: string;
}

export class AuthService {
  /**
   * Generates and stores a 6-digit OTP in MySQL.
   */
  static async generateOtp(email: string, purpose: 'registration' | 'login' | 'verification' = 'registration'): Promise<string> {
    const pool = getPool();
    const normalizedEmail = email.trim().toLowerCase();

    // 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Invalidate previous active OTPs for this email & purpose
    await pool.query(
      'UPDATE otps SET is_used = TRUE WHERE email = ? AND purpose = ?',
      [normalizedEmail, purpose]
    );

    // Save with 10-minute expiry
    await pool.query(
      'INSERT INTO otps (email, otp_code, purpose, expires_at) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 10 MINUTE))',
      [normalizedEmail, otpCode, purpose]
    );

    console.log(`📱 [SakhiSphere OTP] Code for ${normalizedEmail} (${purpose}): ${otpCode}`);
    return otpCode;
  }

  /**
   * Registers a new user, creates their profile and default settings, and triggers OTP.
   */
  static async register(name: string, email: string, password: string): Promise<{ email: string; otpDev: string }> {
    const pool = getPool();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const [existing] = await pool.query<UserRow[]>(
      'SELECT id, is_email_verified FROM users WHERE email = ?',
      [normalizedEmail]
    );

    if (existing.length > 0) {
      if (existing[0].is_email_verified) {
        const error: any = new Error('An account with this email already exists. Please log in.');
        error.statusCode = 409;
        throw error;
      } else {
        // User registered but hasn't verified OTP yet — update password and resend OTP
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        await pool.query(
          'UPDATE users SET name = ?, password_hash = ? WHERE id = ?',
          [name.trim(), passwordHash, existing[0].id]
        );
        const otpDev = await this.generateOtp(normalizedEmail, 'registration');
        return { email: normalizedEmail, otpDev };
      }
    }

    // Hash password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 1. Insert user
    const [userResult] = await pool.query<ResultSetHeader>(
      'INSERT INTO users (name, email, password_hash, is_email_verified) VALUES (?, ?, ?, FALSE)',
      [name.trim(), normalizedEmail, passwordHash]
    );
    const userId = userResult.insertId;

    // 2. Create default profile row
    await pool.query(
      'INSERT INTO profiles (user_id, bio, location, occupation) VALUES (?, ?, ?, ?)',
      [userId, 'New member of SakhiSphere community 🌸', '', '']
    );

    // 3. Create default user settings row
    await pool.query(
      'INSERT INTO user_settings (user_id) VALUES (?)',
      [userId]
    );

    // 4. Generate initial OTP
    const otpDev = await this.generateOtp(normalizedEmail, 'registration');

    return { email: normalizedEmail, otpDev };
  }

  /**
   * Verifies an OTP code and completes registration / authentication.
   */
  static async verifyOtp(email: string, code: string): Promise<{ token: string; user: SanitizedUser }> {
    const pool = getPool();
    const normalizedEmail = email.trim().toLowerCase();

    // Check OTP validity
    const [otpRows]: any = await pool.query(
      'SELECT id FROM otps WHERE email = ? AND otp_code = ? AND is_used = FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1',
      [normalizedEmail, code.trim()]
    );

    if (otpRows.length === 0) {
      const error: any = new Error('Invalid or expired verification code. Please check or request a new code.');
      error.statusCode = 400;
      throw error;
    }

    // Mark OTP as used
    await pool.query('UPDATE otps SET is_used = TRUE WHERE id = ?', [otpRows[0].id]);

    // Mark user as email verified
    await pool.query('UPDATE users SET is_email_verified = TRUE WHERE email = ?', [normalizedEmail]);

    // Fetch user details
    const [rows] = await pool.query<UserRow[]>(
      `SELECT u.id, u.name, u.email, u.phone, u.is_email_verified, u.is_verified, u.created_at,
              p.bio, p.avatar_url, p.location, p.occupation
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      const error: any = new Error('User record not found');
      error.statusCode = 404;
      throw error;
    }

    const userRow = rows[0];

    // Generate JWT token
    const token = jwt.sign({ id: userRow.id, email: userRow.email }, env.jwt.secret, {
      expiresIn: '7d',
    });

    const user: SanitizedUser = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      bio: userRow.bio,
      avatar_url: userRow.avatar_url,
      location: userRow.location,
      occupation: userRow.occupation,
      is_email_verified: Boolean(userRow.is_email_verified),
      is_verified: Boolean(userRow.is_verified),
      createdAt: userRow.created_at,
    };

    return { token, user };
  }

  /**
   * Resends OTP for an email.
   */
  static async resendOtp(email: string, purpose: 'registration' | 'login' | 'verification' = 'registration'): Promise<{ email: string; otpDev: string }> {
    const normalizedEmail = email.trim().toLowerCase();
    const otpDev = await this.generateOtp(normalizedEmail, purpose);
    return { email: normalizedEmail, otpDev };
  }

  /**
   * Authenticates user credentials and returns full user profile + JWT.
   */
  static async login(email: string, password: string): Promise<{ token: string; user: SanitizedUser }> {
    const pool = getPool();
    const normalizedEmail = email.trim().toLowerCase();

    const [rows] = await pool.query<UserRow[]>(
      `SELECT u.id, u.name, u.email, u.phone, u.password_hash, u.is_email_verified, u.is_verified, u.created_at,
              p.bio, p.avatar_url, p.location, p.occupation
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.email = ?`,
      [normalizedEmail]
    );

    if (rows.length === 0) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const userRow = rows[0];

    const isMatch = await bcrypt.compare(password, userRow.password_hash);
    if (!isMatch) {
      const error: any = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT token
    const token = jwt.sign({ id: userRow.id, email: userRow.email }, env.jwt.secret, {
      expiresIn: '7d',
    });

    const user: SanitizedUser = {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      bio: userRow.bio,
      avatar_url: userRow.avatar_url,
      location: userRow.location,
      occupation: userRow.occupation,
      is_email_verified: Boolean(userRow.is_email_verified),
      is_verified: Boolean(userRow.is_verified),
      createdAt: userRow.created_at,
    };

    return { token, user };
  }

  /**
   * Fetches full user profile by ID including interests.
   */
  static async getProfile(userId: number): Promise<any> {
    const pool = getPool();
    const [rows] = await pool.query<UserRow[]>(
      `SELECT u.id, u.name, u.email, u.phone, u.is_email_verified, u.is_verified, u.created_at,
              p.bio, p.avatar_url, p.location, p.occupation, p.privacy_profile_visibility,
              p.privacy_allow_messages, p.privacy_show_online_status
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      const error: any = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const userRow = rows[0];

    // Fetch user interests
    const [interests]: any = await pool.query(
      `SELECT i.id, i.name, i.category, i.icon
       FROM user_interests ui
       JOIN interests i ON ui.interest_id = i.id
       WHERE ui.user_id = ?`,
      [userId]
    );

    return {
      id: userRow.id,
      name: userRow.name,
      email: userRow.email,
      phone: userRow.phone,
      bio: userRow.bio,
      avatar_url: userRow.avatar_url,
      location: userRow.location,
      occupation: userRow.occupation,
      is_email_verified: Boolean(userRow.is_email_verified),
      is_verified: Boolean(userRow.is_verified),
      createdAt: userRow.created_at,
      interests: interests || [],
      privacy: {
        profileVisibility: userRow.privacy_profile_visibility || 'members_only',
        allowMessages: userRow.privacy_allow_messages || 'all_members',
        showOnlineStatus: Boolean(userRow.privacy_show_online_status),
      },
    };
  }
}
