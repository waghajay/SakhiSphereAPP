import mysql from 'mysql2/promise';
import { env } from './env';

let pool: mysql.Pool;

export async function initDatabase(): Promise<void> {
  // 1. Create database if it does not exist
  const initialConnection = await mysql.createConnection({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
  });

  await initialConnection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
  );
  await initialConnection.end();

  // 2. Initialize connection pool
  pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    user: env.db.user,
    password: env.db.password,
    database: env.db.name,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  // 3. Create Users Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      phone VARCHAR(20) NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_email_verified BOOLEAN DEFAULT FALSE,
      is_phone_verified BOOLEAN DEFAULT FALSE,
      is_verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Alter users table if columns are missing from earlier initialization
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) NULL UNIQUE;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT FALSE;`);
  } catch (err) {
    // Some MySQL versions don't support ADD COLUMN IF NOT EXISTS; ignore duplicate column errors
  }

  // 4. Create OTPs Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      otp_code VARCHAR(6) NOT NULL,
      purpose ENUM('registration', 'login', 'verification') DEFAULT 'registration',
      expires_at TIMESTAMP NOT NULL,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_otps_email_code (email, otp_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 5. Create Profiles Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      avatar_url VARCHAR(500) NULL,
      bio TEXT NULL,
      location VARCHAR(100) NULL,
      occupation VARCHAR(100) NULL,
      date_of_birth DATE NULL,
      privacy_profile_visibility ENUM('public', 'members_only', 'connections_only') DEFAULT 'members_only',
      privacy_allow_messages ENUM('all_members', 'connections_only') DEFAULT 'all_members',
      privacy_show_online_status BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 6. Create Interests Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS interests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL UNIQUE,
      category VARCHAR(50) NOT NULL,
      icon VARCHAR(50) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 7. Create User Interests Junction Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_interests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      interest_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY unique_user_interest (user_id, interest_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (interest_id) REFERENCES interests(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 8. Create Verification Requests Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS verification_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      verification_type ENUM('id_proof', 'student_id', 'work_id', 'social_profile') NOT NULL,
      document_note TEXT NULL,
      document_url VARCHAR(500) NULL,
      admin_notes TEXT NULL,
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      reviewed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Create User Settings Table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id INT NOT NULL PRIMARY KEY,
      push_notifications BOOLEAN DEFAULT TRUE,
      email_notifications BOOLEAN DEFAULT TRUE,
      chat_notifications BOOLEAN DEFAULT TRUE,
      community_updates BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 10. Seed Interests Catalog if empty
  const [interestRows]: any = await pool.query('SELECT COUNT(*) as count FROM interests');
  if (interestRows[0].count === 0) {
    const seedInterests = [
      // Arts & Culture
      ['Reading & Books', 'Arts & Culture', '📚'],
      ['Art & Painting', 'Arts & Culture', '🎨'],
      ['Writing & Poetry', 'Arts & Culture', '✍️'],
      ['Music & Singing', 'Arts & Culture', '🎵'],
      ['Photography', 'Arts & Culture', '📸'],

      // Lifestyle & Wellness
      ['Yoga & Meditation', 'Lifestyle & Wellness', '🧘‍♀️'],
      ['Fitness & Gym', 'Lifestyle & Wellness', '💪'],
      ['Mental Wellness', 'Lifestyle & Wellness', '🌱'],
      ['Healthy Cooking', 'Lifestyle & Wellness', '🥗'],
      ['Baking & Desserts', 'Lifestyle & Wellness', '🧁'],

      // Career & Tech
      ['Technology & Coding', 'Career & Tech', '💻'],
      ['Entrepreneurship', 'Career & Tech', '🚀'],
      ['Career Mentorship', 'Career & Tech', '💼'],
      ['Finance & Investing', 'Career & Tech', '💰'],

      // Hobbies & Exploring
      ['Travel & Exploring', 'Hobbies & Exploring', '✈️'],
      ['Gardening & Plants', 'Hobbies & Exploring', '🪴'],
      ['Fashion & Styling', 'Hobbies & Exploring', '👗'],
      ['Movies & Drama', 'Hobbies & Exploring', '🎬'],
      ['DIY & Crafts', 'Hobbies & Exploring', '✂️'],
      ['Pet Care', 'Hobbies & Exploring', '🐾'],
    ];

    await pool.query(
      'INSERT INTO interests (name, category, icon) VALUES ?',
      [seedInterests]
    );
    console.log('🌱 Seeded 20 default interests into MySQL database');
  }

  console.log('✅ SakhiSphere Database & all relational tables ready');
}

export function getPool(): mysql.Pool {
  if (!pool) {
    throw new Error('Database pool has not been initialized. Call initDatabase() first.');
  }
  return pool;
}
