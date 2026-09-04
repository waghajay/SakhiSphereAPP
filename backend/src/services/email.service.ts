// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    if (env.smtp.user && env.smtp.pass) {
      this.transporter = nodemailer.createTransport({
        host: env.smtp.host,
        port: env.smtp.port,
        secure: false,
        auth: {
          user: env.smtp.user,
          pass: env.smtp.pass,
        },
      });
      this.isConfigured = true;
    } else {
      console.warn('⚠️ Email service not configured. OTP will only be logged to console.');
    }
  }

  async sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
    if (!this.isConfigured || !this.transporter) {
      console.log(`📧 [EMAIL NOT SENT - NOT CONFIGURED] To: ${to}, Subject: ${subject}`);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: `"${env.smtp.fromName}" <${env.smtp.fromEmail}>`,
        to,
        subject,
        html,
      });
      console.log(`📧 Email sent to ${to}`);
    } catch (error) {
      console.error('Failed to send email:', error);
      // Don't throw error - allow app to continue even if email fails
      console.warn('⚠️ Email sending failed, but continuing without it');
    }
  }

  async sendOtpEmail(email: string, otp: string, purpose: string): Promise<void> {
    const subject = `Your SakhiSphere Verification Code - ${otp}`;
    const html = this.getOtpTemplate(email, otp, purpose);
    await this.sendEmail({ to: email, subject, html });
  }

  async sendVerificationApprovedEmail(email: string, userName: string): Promise<void> {
    const subject = '🎉 Your SakhiSphere Profile is Verified!';
    const html = this.getApprovalTemplate(userName);
    await this.sendEmail({ to: email, subject, html });
  }

  async sendVerificationRejectedEmail(email: string, userName: string, reason: string): Promise<void> {
    const subject = 'Update on Your SakhiSphere Verification';
    const html = this.getRejectionTemplate(userName, reason);
    await this.sendEmail({ to: email, subject, html });
  }

  private getOtpTemplate(email: string, otp: string, purpose: string): string {
    const purposeText = purpose === 'registration' 
      ? 'complete your registration' 
      : purpose === 'login' 
      ? 'sign in to your account' 
      : 'verify your identity';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 48px; margin-bottom: 10px; }
          h1 { color: #7C3AED; margin: 0; font-size: 28px; font-weight: bold; }
          .subtitle { color: #6B7280; margin-top: 8px; font-size: 14px; }
          .otp-box { 
            background: linear-gradient(135deg, #F3E8FF 0%, #E9D5FF 100%);
            border: 2px dashed #7C3AED; 
            border-radius: 16px; 
            padding: 24px; 
            text-align: center; 
            margin: 30px 0;
          }
          .otp-label { color: #6B7280; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px; }
          .otp-code { 
            font-size: 42px; 
            font-weight: bold; 
            color: #7C3AED; 
            letter-spacing: 12px;
            font-family: 'Courier New', monospace;
          }
          .info { color: #374151; line-height: 1.8; font-size: 14px; }
          .warning { 
            background: #FEF3C7; 
            border-left: 4px solid #F59E0B; 
            border-radius: 8px; 
            padding: 12px 16px; 
            margin-top: 20px;
            font-size: 13px;
            color: #92400E;
          }
          .footer { margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #F3F4F6; padding-top: 20px; }
          .brand { color: #7C3AED; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌸</div>
            <h1>SakhiSphere</h1>
            <p class="subtitle">Safe Socializing for Women</p>
          </div>
          <div class="otp-box">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          <div class="info">
            <p>Hello ${email},</p>
            <p>Use the code above to ${purposeText}. This code will expire in <strong>10 minutes</strong>.</p>
          </div>
          <div class="warning">
            <strong>🔒 Security Tip:</strong> Never share this code with anyone. SakhiSphere will never ask for your verification code.
          </div>
          <div class="footer">
            <p><span class="brand">🌸 SakhiSphere</span> - Safe Socializing for Women</p>
            <p>If you didn't request this code, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getApprovalTemplate(userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 48px; margin-bottom: 10px; }
          h1 { color: #059669; margin: 0; font-size: 28px; }
          .badge { 
            background: linear-gradient(135deg, #10B981 0%, #059669 100%);
            color: white; 
            padding: 12px 24px; 
            border-radius: 24px; 
            display: inline-block; 
            margin: 20px 0;
            font-size: 16px;
            font-weight: bold;
          }
          .content { color: #374151; line-height: 1.8; font-size: 14px; }
          .benefits { background: #F0FDF4; border-radius: 12px; padding: 20px; margin: 20px 0; }
          .benefits li { margin-bottom: 8px; }
          .footer { margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #F3F4F6; padding-top: 20px; }
          .brand { color: #7C3AED; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🛡️</div>
            <h1>Verification Approved!</h1>
          </div>
          <div class="content">
            <p>Dear ${userName},</p>
            <p>Great news! Your identity verification has been approved by our team.</p>
            <div style="text-align: center;">
              <span class="badge">✓ Verified Sakhi Member</span>
            </div>
            <div class="benefits">
              <p><strong>You now have access to:</strong></p>
              <ul>
                <li>✅ Verified-only groups and events</li>
                <li>✅ Increased trust from community members</li>
                <li>✅ Exclusive networking opportunities</li>
                <li>✅ Priority support from our team</li>
              </ul>
            </div>
            <p>Thank you for helping keep SakhiSphere a safe and authentic community!</p>
          </div>
          <div class="footer">
            <p><span class="brand">🌸 SakhiSphere</span> - Safe Socializing for Women</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getRejectionTemplate(userName: string, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f3ff; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 48px; margin-bottom: 10px; }
          h1 { color: #DC2626; margin: 0; font-size: 28px; }
          .content { color: #374151; line-height: 1.8; font-size: 14px; }
          .reason-box { background: #FEF2F2; border-left: 4px solid #DC2626; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .footer { margin-top: 30px; text-align: center; color: #9CA3AF; font-size: 12px; border-top: 1px solid #F3F4F6; padding-top: 20px; }
          .brand { color: #7C3AED; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">📋</div>
            <h1>Verification Update</h1>
          </div>
          <div class="content">
            <p>Dear ${userName},</p>
            <p>We regret to inform you that your verification request could not be approved at this time.</p>
            <div class="reason-box">
              <strong>Reason:</strong> ${reason || 'The submitted document did not meet our verification requirements.'}
            </div>
            <p>You can submit a new verification request with clearer documentation. If you believe this is an error, please contact our support team.</p>
          </div>
          <div class="footer">
            <p><span class="brand">🌸 SakhiSphere</span> - Safe Socializing for Women</p>
            <p>This is an automated message, please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();