# Email Service Setup Guide

This guide explains how to configure email delivery for OTP verification in QuickGrab.

## Overview

QuickGrab uses SMTP-based email delivery (via Nodemailer) for sending OTP verification codes during user registration. The system supports various email providers including Gmail, SendGrid, Mailgun, Amazon SES, or any custom SMTP server.

## Quick Start

1. Choose an email provider from the options below
2. Get your SMTP credentials from the provider
3. Add the configuration to your `.env` file
4. Restart your development server

## Environment Variables

Add these variables to your `.env` file:

```env
# Required for email functionality
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@example.com"
EMAIL_PASSWORD="your-password-or-api-key"
EMAIL_FROM="QuickGrab <noreply@yourdomain.com>"
```

### Variable Descriptions

| Variable | Description | Example |
|----------|-------------|---------|
| `EMAIL_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `EMAIL_PORT` | SMTP server port | `587` (TLS) or `465` (SSL) |
| `EMAIL_SECURE` | Use SSL/TLS | `true` for port 465, `false` for 587 |
| `EMAIL_USER` | SMTP username/email | `your-email@gmail.com` |
| `EMAIL_PASSWORD` | SMTP password or app password | `your-app-password` |
| `EMAIL_FROM` | Sender address shown to recipients | `QuickGrab <noreply@yourdomain.com>` |

## Provider-Specific Setup

### Gmail (Recommended for Development)

Gmail is great for development and testing, but has a daily limit of ~500 emails.

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password:**
   - Go to [Google Account Security](https://myaccount.google.com/security)
   - Under "Signing in to Google," click "App passwords"
   - Select "Mail" and your device
   - Copy the 16-character password

3. **Configure `.env`:**
```env
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-16-char-app-password"
EMAIL_FROM="QuickGrab <your-email@gmail.com>"
```

> **Note:** Never use your regular Gmail password. Always use an App Password.

---

### SendGrid (Recommended for Production)

SendGrid offers 100 free emails/day with easy setup.

1. **Create a SendGrid account** at [sendgrid.com](https://sendgrid.com)
2. **Create an API Key:**
   - Go to Settings → API Keys → Create API Key
   - Select "Restricted Access" with "Mail Send" permission
   - Copy the API key (shown only once)

3. **Configure `.env`:**
```env
EMAIL_HOST="smtp.sendgrid.net"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="apikey"
EMAIL_PASSWORD="SG.your-api-key-here"
EMAIL_FROM="QuickGrab <noreply@yourdomain.com>"
```

> **Note:** The username must be literally `apikey`, not your email.

---

### Mailgun

Mailgun offers 5,000 free emails for 3 months.

1. **Create a Mailgun account** at [mailgun.com](https://www.mailgun.com)
2. **Get SMTP credentials:**
   - Go to Sending → Domain Settings → SMTP credentials
   - Create a new SMTP user or use the default one

3. **Configure `.env`:**
```env
EMAIL_HOST="smtp.mailgun.org"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="postmaster@your-domain.mailgun.org"
EMAIL_PASSWORD="your-mailgun-smtp-password"
EMAIL_FROM="QuickGrab <noreply@your-domain.mailgun.org>"
```

---

### Amazon SES

Great for high-volume production use with very low costs.

1. **Set up Amazon SES** in your AWS Console
2. **Verify your domain or email address**
3. **Create SMTP credentials:**
   - Go to SES → SMTP Settings → Create SMTP credentials
   - Download or copy the credentials

4. **Configure `.env`:**
```env
EMAIL_HOST="email-smtp.us-east-1.amazonaws.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-ses-smtp-username"
EMAIL_PASSWORD="your-ses-smtp-password"
EMAIL_FROM="QuickGrab <noreply@your-verified-domain.com>"
```

> **Note:** Replace `us-east-1` with your AWS region.

---

### Custom SMTP Server

For any other SMTP provider:

```env
EMAIL_HOST="your-smtp-server.com"
EMAIL_PORT="587"
EMAIL_SECURE="false"
EMAIL_USER="your-username"
EMAIL_PASSWORD="your-password"
EMAIL_FROM="QuickGrab <noreply@yourdomain.com>"
```

## Development Mode

If email is **not configured**, the system will:
1. Log OTP codes to the console
2. Return OTP in the API response (development only)
3. Continue with registration flow without sending emails

This allows you to develop and test without setting up email.

Example console output:
```
[DEV MODE] Email verification OTP for user@example.com: 123456
```

## Testing Your Configuration

After configuring email, test it by:

1. Start your development server: `npm run dev`
2. Go to `/signup` and register a new account
3. Check your email inbox (and spam folder) for the OTP
4. Check the server logs for any errors

### Common Issues

#### Emails going to spam
- Verify your domain with your email provider
- Use a professional sender address
- Avoid spam trigger words in emails

#### Connection timeout
- Check if your firewall allows outbound SMTP connections
- Verify the hostname and port are correct
- Try using port 465 with `EMAIL_SECURE="true"`

#### Authentication failed
- Double-check your credentials
- For Gmail, ensure you're using an App Password
- For SendGrid, ensure username is `apikey`

#### Rate limiting
- Free tiers have daily limits
- Consider upgrading to a paid plan for production
- The resend OTP endpoint has built-in rate limiting (60 seconds)

## API Endpoints

### Register User
`POST /api/auth/register`
- Sends OTP email automatically after successful registration

### Resend OTP
`POST /api/auth/resend-otp`
- Request body: `{ "email": "user@example.com" }`
- Rate limited to once per 60 seconds
- Returns new OTP in development mode if email is not configured

### Verify Email
`POST /api/auth/verify-email`
- Request body: `{ "email": "user@example.com", "otp": "123456" }`
- OTP expires after 10 minutes

## Security Considerations

1. **Never commit credentials** to version control
2. **Use environment variables** for all sensitive configuration
3. **Use App Passwords** for Gmail (never your actual password)
4. **Enable rate limiting** (already implemented for resend)
5. **Set OTP expiration** (currently 10 minutes)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Test with a simpler provider like Gmail first
4. [Open an issue on GitHub](https://github.com/Harshul23/5-star/issues)
