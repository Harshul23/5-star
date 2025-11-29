/**
 * Email Service
 * Sends emails using SMTP (via Nodemailer)
 * Supports various providers like Gmail, SendGrid, Mailgun, or custom SMTP
 */

import nodemailer from "nodemailer";

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || "",
  port: parseInt(process.env.EMAIL_PORT || "587"),
  secure: process.env.EMAIL_SECURE === "true", // true for 465, false for other ports
  user: process.env.EMAIL_USER || "",
  password: process.env.EMAIL_PASSWORD || "",
  from: process.env.EMAIL_FROM || "QuickGrab <noreply@quickgrab.com>",
};

// Check if email service is configured
export function isEmailConfigured(): boolean {
  return !!(
    EMAIL_CONFIG.host &&
    EMAIL_CONFIG.user &&
    EMAIL_CONFIG.password
  );
}

// Create reusable transporter
function createTransporter() {
  if (!isEmailConfigured()) {
    console.warn(
      "Email service not configured. Set EMAIL_HOST, EMAIL_USER, and EMAIL_PASSWORD environment variables."
    );
    return null;
  }

  return nodemailer.createTransport({
    host: EMAIL_CONFIG.host,
    port: EMAIL_CONFIG.port,
    secure: EMAIL_CONFIG.secure,
    auth: {
      user: EMAIL_CONFIG.user,
      pass: EMAIL_CONFIG.password,
    },
  });
}

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResult> {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[DEV MODE] Email would be sent to ${options.to}:`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body: ${options.text}`);
    return {
      success: false,
      error: "Email service not configured",
    };
  }

  try {
    const info = await transporter.sendMail({
      from: EMAIL_CONFIG.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`Email sent successfully to ${options.to}: ${info.messageId}`);
    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown email error",
    };
  }
}

/**
 * Send OTP verification email
 */
export async function sendOTPEmail(
  email: string,
  otp: string,
  userName: string
): Promise<SendEmailResult> {
  const subject = "QuickGrab - Verify Your Email";
  const text = `
Hello ${userName},

Your verification code is: ${otp}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

- The QuickGrab Team
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">QuickGrab</h1>
    <p style="color: #666; margin: 5px 0;">Verified Student Marketplace</p>
  </div>
  
  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; text-align: center;">
    <h2 style="margin-top: 0;">Verify Your Email</h2>
    <p>Hello ${userName},</p>
    <p>Use the code below to verify your email address:</p>
    
    <div style="background: #2563eb; color: white; font-size: 32px; letter-spacing: 8px; padding: 15px 30px; border-radius: 8px; display: inline-block; margin: 20px 0; font-weight: bold;">
      ${otp}
    </div>
    
    <p style="color: #666; font-size: 14px;">
      This code will expire in <strong>10 minutes</strong>.
    </p>
  </div>
  
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #666; font-size: 12px;">
    <p>If you didn't request this code, please ignore this email.</p>
    <p>© ${new Date().getFullYear()} QuickGrab. All rights reserved.</p>
  </div>
</body>
</html>
  `.trim();

  return sendEmail({
    to: email,
    subject,
    text,
    html,
  });
}
