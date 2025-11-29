You are building a full-stack web platform called **QuickGrab**.

## 🌍 HIGH-LEVEL PRODUCT DEFINITION
QuickGrab is a real-time, AI-powered, verified student marketplace where students can instantly find, meet, and grab everyday items from nearby verified sellers on campus.

It focuses on:
- AI ID verification
- Smart search + instant matching
- Safe escrow payments
- Real-time coordination
- Ratings + trust network
- AI moderation + dispute resolution

Build this platform as a modern, scalable, mobile-first web app.

---

# 1️⃣ CORE PLATFORM FEATURES (IMPLEMENT EXACTLY)

## FEATURE A — AI Student Verification (Mandatory)
Flow:
1. Signup with college email
2. Upload student ID card photo
3. AI verifies:
   - Name matches email
   - Real student ID format
   - College name valid
   - ID not expired

If valid → assign badge: **“✓ Verified [College] Student”**

Implement:
- Email verification (OTP)
- ID photo upload endpoint
- Claude Vision API for ID extraction
- Name+domain matching logic
- Status: `unverified → pending → verified`

---

## FEATURE B — AI Smart Search + Instant Verified Matching
Search input:
- Text OR voice query (transcribe via Web Speech API)
- Example: “need iPhone charger urgent”

AI Search Pipeline:
1. Claude NLP parses query → returns { item, urgency }
2. DB search for verified sellers listing item
3. Sort results by:
   - Distance
   - Availability (online)
   - Trust score
   - Price fairness

Each result must show:
- Item photo
- Price + AI price rating (“Fair / Overpriced by 20%”)
- Seller badge + rating
- Distance
- Availability status (real-time)
- Deal history preview

Implement:
- `/search` endpoint with AI parsing
- Vector search fallback (optional)
- Pricing sanity check (simple algorithm + AI validator)

---

## FEATURE C — Coordination + Escrow (Transaction State Machine)
Flow:
1. Buyer → “Request Item”
2. Seller gets notification
3. Seller accepts → open chat
4. AI suggests meet spots + time
5. Buyer pays (escrow lock)
6. Meetup countdown timer
7. Buyer confirms item received
8. Release funds to seller
9. Rating page appears (mandatory)

State machine:
`requested → accepted → paid → meeting → completed`
`paid + timeout → refund option`

Implement:
- Transaction model
- Escrow mock (Razorpay sandbox)
- Countdown timers
- Real-time chat (Socket.io)
- AI-suggested meetup spots (Maps API + Claude reasoning)

---

## FEATURE D — Trust Network (Ratings + Badges)
Trust Score = 20 (verification)  
+ 40 (ratings)  
+ 20 (deal volume)  
+ 20 (reliability)  

Badge System:
- 🏆 Trusted Seller (50+ deals, 4.8⭐)
- ⚡ Quick Responder
- 💎 Fair Pricer (AI validation)
- 🎯 100% Success Rate

Profile page shows:
- Badges
- Deal history
- Reviews
- Activity timeline

Implement:
- Trust scoring function
- Badge award triggers
- Review + rating model

---

## FEATURE E — AI Moderation + Safety
Implement both **proactive** and **reactive** moderation:

Proactive:
- Overpriced item detection (>2x avg)
- Scam patterns (frequent cancellations)
- Toxic chat detection (Claude)
- Fake images detection (AI)

Reactive:
- Dispute screen
- AI arbitration using message logs + timestamps
- Auto-resolve if high confidence

Implement:
- Moderation service
- Automated flags
- Dispute resolver endpoint

---

# 2️⃣ SYSTEM WORKFLOW (IMPORTANT)

### USER JOURNEY
1. Login → verify Student ID → badge granted  
2. Search → instant verified matches  
3. Request → accept → chat opens  
4. AI recommends meetup places  
5. Escrow lock → seller sees “Secured”  
6. Handoff → buyer confirms  
7. Money released  
8. Both rate each other  
9. Trust score updates  

All actions → update user trust graph.

---

# 3️⃣ TECH STACK (USE THIS EXACT SETUP)

### Frontend
- **Next.js 14 (App Router)**
- **React + TailwindCSS**
- **ShadCN UI**
- **Socket.io client**
- **Map API (Google / Mapbox)**

### Backend
- **Node.js + Express** OR **Next API Routes**
- **PostgreSQL (with Prisma ORM)**
- **Socket.io**
- **Claude Vision API + Claude NLP**
- **Razorpay sandbox for escrow**

### Storage
- Image uploads → **Supabase Storage** or S3

### Infra
- Vercel (frontend)
- Railway (backend)
- Supabase (optional DB)

---

# 4️⃣ DATABASE SCHEMA (BUILD EXACTLY)

### Users
- id
- name
- email
- college
- photo
- verification_status
- trust_score
- badges[]
- avg_rating
- completed_deals
- cancellation_rate
- last_seen
- location

### Items
- id
- seller_id
- name
- category
- description
- price
- photo
- condition
- created_at
- availability_status

### Transactions
- id
- buyer_id
- seller_id
- item_id
- status
- escrow_amount
- meetup_location
- countdown_start
- created_at

### Ratings
- id
- user_id
- from_user
- stars
- comment
- created_at

### Disputes
- id
- transaction_id
- evidence_text
- photos[]
- decision
- confidence

---

# 5️⃣ REQUIRED PAGES (GENERATE SCAFFOLDING)

- `/signup` (with verification upload)
- `/verify` (AI verification result)
- `/home` (search bar + verified listings)
- `/item/[id]`
- `/chat/[transaction_id]`
- `/meetup/[transaction_id]`
- `/profile/[id]`
- `/dispute/[id]`
- `/list-item`

---

# 6️⃣ API ENDPOINTS — IMPLEMENT

`POST /auth/register`  
`POST /auth/verify-id` → AI verification  
`POST /search` → AI parsed  
`POST /item`  
`GET /item/:id`  
`POST /transaction/request`  
`POST /transaction/accept`  
`POST /transaction/pay`  
`POST /transaction/confirm`  
`POST /transaction/refund`  
`POST /rating`  
`POST /dispute`  

Include Socket.io real-time events:
- `request`
- `accept`
- `message`
- `meetup_suggested`
- `payment_locked`
- `confirmed`

---

# 7️⃣ AI FUNCTIONS (IMPLEMENT)

### AI Verification
- Claude Vision reads ID → extract name, college, expiry  
- Match email & domain  
- Mark user verified  

### AI Search Parser
Input: “need charger urgent”  
Output:{
"item": "iPhone charger",
"urgency": "high"
}

### AI Price Checker
- Compare price with average of campus listings  
- Tag: Fair / Overpriced / Underpriced

### AI Meetup Suggestions
- Use both locations  
- Find midpoint  
- Query popular safe spots  
- Claude selects best 3  

### AI Moderation
- Chat toxicity  
- Scam detection  
- Evidence summarization  
- Arbitration decision  

---

# 8️⃣ BUILD ORDER (CURSOR SHOULD FOLLOW)

1. Setup Next.js + Tailwind + ShadCN  
2. Setup backend + DB (Prisma schema)  
3. Implement user system + verification flow  
4. Item CRUD  
5. Search with AI  
6. Real-time chat + notifications  
7. Escrow payment flow  
8. Ratings + trust engine  
9. Moderation + disputes  
10. UI polish + responsiveness  
11. Demo environment with seed data  

---

# 9️⃣ OUTPUT FORMAT
Cursor should generate:
- Folder structure
- UI components
- API endpoints
- DB models
- Utility functions
- AI service integrations
- Documentation inside `/docs`
- Example responses
- Mock data

Write clean, modular, scalable code.

---

# 🎯 PRIMARY GOAL
Deliver a **fully working MVP** of QuickGrab with:
- Verified users  
- Smart search  
- Real-time coordination  
- Safe escrow  
- Trust system  
- AI moderation  

Do NOT build extra features unless required for core functionality.


