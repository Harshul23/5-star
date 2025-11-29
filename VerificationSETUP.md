# Student Verification System Setup Guide

This document provides complete setup instructions for the QuickGrab Student Verification System with student email validation, OTP verification, face matching, OCR, and auto-approval capabilities.

## Table of Contents

1. [Overview](#overview)
2. [Student Email Verification Flow](#student-email-verification-flow)
3. [ID Verification Flow (Optional)](#id-verification-flow-optional)
4. [Quick Start](#quick-start)
5. [Detailed Setup](#detailed-setup)
6. [API Reference](#api-reference)
7. [Configuration](#configuration)
8. [Admin Dashboard](#admin-dashboard)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The Student Verification System validates student identities through multiple layers:

### Layer 1: Student Email Verification (Required)
- **Email Domain Validation**: Restricts signup to approved student domains (.edu, .ac.in, etc.)
- **OTP Verification**: 6-digit code sent to student email for verification
- **Status Tracking**: unverified → verified flow

### Layer 2: ID Verification (Optional)
- **Face Matching** (3-10 seconds): Compares selfie with student ID photo
- **OCR Text Extraction** (2-5 seconds): Extracts name, college, and student ID from ID card
- **Auto-Approval Logic**: Automatically approves verifications that meet all criteria
- **Manual Review Fallback**: Flags uncertain cases for admin review

### Key Features

- ✅ Student email domain validation (.edu, .ac.in, .ac.uk, etc.)
- ✅ OTP-based email verification
- ✅ Face matching using AWS Rekognition or Face++
- ✅ OCR extraction using Claude Vision API
- ✅ Configurable approval thresholds
- ✅ Background worker for queue processing
- ✅ Admin review dashboard support
- ✅ Comprehensive error handling and logging

### Access Restrictions

Unverified users CANNOT:
- List items for sale
- Chat with other users
- Buy or sell items
- Access the main marketplace

Only verified users gain full platform access.

---

## Student Email Verification Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                STUDENT EMAIL VERIFICATION FLOW                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Signup                                                  │
│     ├── Enter Name                                               │
│     ├── Enter Student Email (college domain required)           │
│     └── Enter Password                                           │
│                          ▼                                       │
│  2. Domain Validation                                            │
│     ├── Check if email ends with approved domain                │
│     ├── .edu, .ac.in, .ac.uk, etc.                              │
│     └── Reject non-student emails (Gmail, Yahoo, etc.)          │
│                          ▼                                       │
│  3. OTP Generation                                               │
│     ├── Generate 6-digit OTP                                     │
│     └── Send to student email                                    │
│                          ▼                                       │
│  4. Email Verification                                           │
│     ├── User enters OTP                                          │
│     └── Verify within 10 minutes                                 │
│                          ▼                                       │
│  5. Account Activation                                           │
│     ├── Mark emailVerified = true                                │
│     └── Grant full platform access                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Approved Student Domains

The system accepts emails from the following domains:

| Region | Domains |
|--------|---------|
| US | .edu |
| India | .ac.in, .edu.in, .iit.ac.in, .nit.ac.in, .bits-pilani.ac.in, etc. |
| UK | .ac.uk |
| Australia | .edu.au |
| Canada | .edu.ca |
| Europe | .edu.es, .edu.fr, .edu.de, .ac.at, .edu.it |
| Asia | .edu.cn, .edu.sg, .edu.hk, .edu.my, .edu.ph |
| Others | .edu.br, .edu.mx |

---

## ID Verification Flow (Optional)

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER VERIFICATION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. User Upload                                                  │
│     ├── Upload Student ID Photo                                  │
│     └── Upload Selfie Photo                                      │
│                          ▼                                       │
│  2. Store Images                                                 │
│     └── Save to Firebase/S3/Cloud Storage                        │
│                          ▼                                       │
│  3. AI Processing (Parallel)                                     │
│     ├── Face Matching (3-10 sec)                                │
│     │   └── Compare selfie with ID photo                        │
│     └── OCR Extraction (2-5 sec)                                │
│         └── Extract name, college, ID number, expiry            │
│                          ▼                                       │
│  4. Auto-Approval Check                                          │
│     ├── Face match score ≥ 75%? ✓                               │
│     ├── OCR confidence ≥ 70%? ✓                                 │
│     ├── College recognized? ✓                                   │
│     └── ID looks valid? ✓                                       │
│                          ▼                                       │
│  5. Decision                                                     │
│     ├── All criteria met → AUTO_APPROVED                        │
│     ├── Some criteria failed → NEEDS_REVIEW                     │
│     └── Obvious issues → REJECTED                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Generate Prisma Client

```bash
npx prisma generate
npx prisma db push
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Start Development Server

```bash
npm run dev
```

### 5. Test Verification Endpoint

```bash
curl -X POST http://localhost:3000/api/auth/verify-student \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid-here",
    "studentIdPhotoUrl": "https://storage.example.com/id-photo.jpg",
    "selfiePhotoUrl": "https://storage.example.com/selfie.jpg",
    "immediate": true
  }'
```

---

## Detailed Setup

### Face Matching Configuration

Choose one of the following providers:

#### Option A: AWS Rekognition (Recommended)

1. Create an AWS account at [aws.amazon.com](https://aws.amazon.com)
2. Enable Amazon Rekognition service
3. Create IAM credentials with Rekognition permissions
4. Add to `.env`:

```env
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_REGION="us-east-1"
```

#### Option B: Face++ API

1. Sign up at [faceplusplus.com](https://www.faceplusplus.com)
2. Create an application to get API credentials
3. Add to `.env`:

```env
FACEPP_API_KEY="your-api-key"
FACEPP_API_SECRET="your-api-secret"
```

### OCR Configuration

The system uses Claude Vision API for OCR:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add to `.env`:

```env
ANTHROPIC_API_KEY="your-anthropic-api-key"
```

### Database Schema

Run the Prisma migration to add verification tables:

```bash
npx prisma db push
```

This creates the `StudentVerification` table with fields for:
- Face matching results (score, confidence)
- OCR results (extracted name, college, ID, expiry)
- Processing metadata (timing, status)
- Review data (reviewer, notes, rejection reason)

---

## API Reference

### Submit Verification

**POST** `/api/auth/verify-student`

```json
{
  "userId": "uuid",
  "studentIdPhotoUrl": "https://...",
  "selfiePhotoUrl": "https://...",
  "immediate": true
}
```

**Response (immediate=true):**

```json
{
  "message": "Verification successful!",
  "verification": {
    "id": "verification-uuid",
    "status": "AUTO_APPROVED",
    "processingTimeMs": 7500
  },
  "details": {
    "faceMatch": {
      "similarity": 87.5,
      "confidence": 95.2,
      "success": true
    },
    "ocr": {
      "extractedName": "John Smith",
      "extractedCollege": "Stanford University",
      "confidence": 92.0,
      "success": true
    }
  },
  "thresholds": {
    "faceMatchMin": 75,
    "ocrConfidenceMin": 70
  }
}
```

**Response (immediate=false):**

```json
{
  "message": "Verification submitted. You will be notified once processing is complete.",
  "verification": {
    "id": "verification-uuid",
    "status": "PENDING",
    "queuePosition": 3
  }
}
```

### Get Verification Status

**GET** `/api/auth/verify-student?userId=<uuid>`

```json
{
  "userStatus": "VERIFIED",
  "latestVerification": {
    "id": "verification-uuid",
    "status": "AUTO_APPROVED",
    "faceMatchScore": 87.5,
    "ocrConfidence": 92.0,
    "extractedCollege": "Stanford University",
    "processingTimeMs": 7500,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### Admin: Get Pending Verifications

**GET** `/api/admin/verifications?page=1&limit=20`

Requires authentication header: `Authorization: Bearer <token>`

### Admin: Review Verification

**POST** `/api/admin/verifications`

```json
{
  "verificationId": "uuid",
  "action": "APPROVE",
  "notes": "Manually verified college enrollment"
}
```

Or to reject:

```json
{
  "verificationId": "uuid",
  "action": "REJECT",
  "rejectionReason": "ID appears to be expired"
}
```

### Admin: Worker Status

**GET** `/api/admin/worker`

Returns worker health and configuration.

**POST** `/api/admin/worker`

```json
{
  "action": "process_batch"
}
```

Triggers manual batch processing.

---

## Configuration

### Verification Thresholds

All thresholds are configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `VERIFICATION_FACE_MATCH_MIN` | 75 | Minimum face match score (0-100) |
| `VERIFICATION_OCR_CONFIDENCE_MIN` | 70 | Minimum OCR confidence (0-100) |
| `VERIFICATION_AUTO_APPROVAL_FACE_MIN` | 75 | Face match threshold for auto-approval |
| `VERIFICATION_AUTO_APPROVAL_OCR_MIN` | 70 | OCR confidence threshold for auto-approval |
| `VERIFICATION_MAX_RETRIES` | 3 | Max retries for failed verifications |
| `VERIFICATION_TIMEOUT_MS` | 15000 | Processing timeout (milliseconds) |

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `VERIFICATION_ENABLE_FACE_MATCHING` | true | Enable/disable face matching |
| `VERIFICATION_ENABLE_OCR` | true | Enable/disable OCR extraction |
| `VERIFICATION_ENABLE_AUTO_APPROVAL` | true | Enable/disable auto-approval |

### Recognized Colleges

The system includes a default list of recognized colleges. To add more:

Edit `lib/services/verification-config.ts`:

```typescript
recognizedColleges: [
  "your-college-name",
  // ... existing colleges
]
```

---

## Admin Dashboard

### Review Queue

The admin dashboard displays pending verifications with:

- Student ID photo and selfie thumbnails
- Face match score and confidence
- OCR extracted data
- Processing notes and issues
- Approve/Reject buttons

### Integration Points

To integrate with your admin UI:

1. **Fetch pending verifications:**
   ```javascript
   const response = await fetch('/api/admin/verifications', {
     headers: { Authorization: `Bearer ${token}` }
   });
   const { verifications, pagination, workerHealth } = await response.json();
   ```

2. **Review a verification:**
   ```javascript
   await fetch('/api/admin/verifications', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       Authorization: `Bearer ${token}`
     },
     body: JSON.stringify({
       verificationId: 'uuid',
       action: 'APPROVE',
       notes: 'Approved after manual review'
     })
   });
   ```

---

## Troubleshooting

### Common Issues

#### 1. Face matching returns low scores

**Possible causes:**
- Poor lighting in selfie or ID photo
- Face partially obscured
- ID photo is low quality

**Solution:**
- Ensure good lighting when taking photos
- Remove glasses, hats, or face coverings
- Use a high-resolution camera

#### 2. OCR extraction fails

**Possible causes:**
- ID card is blurry or at an angle
- Non-standard ID format
- Reflections or glare on ID

**Solution:**
- Take photo on a flat surface
- Ensure all text is visible and readable
- Avoid flash photography

#### 3. Auto-approval not working

**Check:**
1. All thresholds are configured correctly
2. `VERIFICATION_ENABLE_AUTO_APPROVAL` is `true`
3. College is in the recognized list

#### 4. Worker not processing queue

**Check:**
1. Worker health endpoint: `GET /api/admin/worker`
2. Database connection is working
3. No stuck verifications in "PROCESSING" status

### Logs

Enable verbose logging by setting:

```env
NODE_ENV=development
```

Check server logs for detailed processing information.

---

## Security Considerations

1. **Image Storage:** Store uploaded images in a secure, authenticated storage service (S3, Firebase Storage, etc.)

2. **API Rate Limiting:** Implement rate limiting on verification endpoints to prevent abuse

3. **Admin Access:** Ensure only authorized users can access admin endpoints

4. **Data Retention:** Implement data cleanup policies for old verification records

5. **API Keys:** Never expose API keys in client-side code

---

## Production Deployment

### Recommended Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│  Next.js    │────▶│  Database   │
│   (Web)     │     │  API        │     │  (Postgres) │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  Background │
                    │   Worker    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │   AWS    │ │  Claude  │ │  Image   │
        │Rekognition│ │   API   │ │  Storage │
        └──────────┘ └──────────┘ └──────────┘
```

### Cloud Functions / Workers

For production, consider running the background worker as:

1. **AWS Lambda** with CloudWatch Events trigger
2. **Google Cloud Functions** with Cloud Scheduler
3. **Vercel Cron Jobs** (if using Vercel)
4. **Railway Worker** (separate service)

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Total processing time | 5-12 seconds | ✅ 5-12 sec |
| Face matching | 3-10 seconds | ✅ 3-10 sec |
| OCR extraction | 2-5 seconds | ✅ 2-5 sec |
| Auto-approval rate | >80% | Depends on data |

---

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review [API documentation](./docs/API.md)
3. [Open an issue on GitHub](https://github.com/Harshul23/5-star/issues)
