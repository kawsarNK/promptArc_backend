# PromptArc Backend — AI Prompt Sharing & Marketplace API

![Node.js](https://img.shields.io/badge/Node.js-22+-339933?logo=node.js)
![Express](https://img.shields.io/badge/Express-5-black?logo=express)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)
![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel)
![Status](https://img.shields.io/badge/Status-Live-success)

PromptArc Backend is the REST API for the **PromptArc AI Prompt Sharing & Marketplace Platform**.

It handles authentication, authorization, prompt management, moderation, bookmarks, reviews, reports, Premium access, Stripe payments, Cloudinary image uploads, notifications, analytics, pagination, search/filter/sorting, and administrative operations.

---

# 🔗 Live Links

### Backend API

https://prompt-arc-backend.vercel.app

### API Base URL

```text
https://prompt-arc-backend.vercel.app/api
```

### Backend Health Check

https://prompt-arc-backend.vercel.app/api/health

### Frontend

https://prompt-arc-frontend.vercel.app

### Server Repository

https://github.com/kawsarNK/promptArc_backend

### Client Repository

https://github.com/kawsarNK/promptArc_frontend

---

# 🎯 Project Purpose

PromptArc Backend provides the secure server-side functionality required by the PromptArc AI Prompt Sharing & Marketplace Platform.

The backend stores and manages real application data using MongoDB and provides REST APIs for:

- User authentication
- Google authentication
- JWT session management
- User role management
- Prompt creation and management
- Prompt moderation
- Prompt bookmarks
- Copy tracking
- Reviews and ratings
- Prompt reporting
- Premium access
- Stripe payments
- Cloudinary image uploads
- User dashboard data
- Creator analytics
- Admin analytics
- Notifications
- Search
- Filtering
- Sorting
- Pagination
- MongoDB aggregation

The backend is deployed separately from the frontend and communicates with the Next.js client through secure REST API requests.

---

# 🧰 Technology Stack

## Backend

- Node.js
- Express.js
- JavaScript
- REST API

## Database

- MongoDB Atlas
- Mongoose

## Authentication

- JSON Web Token (JWT)
- bcryptjs
- Google Auth Library

## Payment

- Stripe

## Image Upload

- Cloudinary
- Multer

## Security & Middleware

- Helmet
- CORS
- Express Rate Limit
- Cookie Parser
- Morgan
- dotenv

## Deployment

- Vercel

---

# 📦 Main NPM Packages

```text
bcryptjs
cloudinary
cookie-parser
cors
dotenv
express
express-rate-limit
google-auth-library
helmet
jsonwebtoken
mongoose
morgan
multer
stripe
```

---

# 📦 Package Versions

```json
{
  "bcryptjs": "^3.0.2",
  "cloudinary": "^2.7.0",
  "cookie-parser": "^1.4.7",
  "cors": "^2.8.5",
  "dotenv": "^17.2.1",
  "express": "^5.1.0",
  "express-rate-limit": "^8.0.1",
  "google-auth-library": "^10.2.1",
  "helmet": "^8.1.0",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.17.1",
  "morgan": "^1.10.1",
  "multer": "^2.0.2",
  "stripe": "^18.4.0"
}
```

---

# 🔐 Authentication

PromptArc uses JWT-based authentication to manage authenticated sessions securely.

Supported authentication methods include:

- Email and password registration
- Email and password login
- Google Login
- JWT token generation
- Authentication persistence
- Protected API routes
- Role-based route protection

Passwords are hashed before being stored in the database.

---

# 📝 User Registration

New users can create an account using:

- Name
- Email
- Photo URL
- Password

Regular registration creates a standard user account.

---

# 🔑 User Login

Users can log in using their registered email and password.

After successful login:

1. Credentials are verified
2. User information is loaded
3. JWT token is generated
4. Authentication information is returned to the frontend
5. Protected resources become available

---

# 🔵 Google Authentication

PromptArc supports Google Login.

Google Identity tokens are verified by the backend using:

```text
google-auth-library
```

If a Google user does not already exist in the database, a new account is created.

New Google users receive the default role:

```text
user
```

---

# 👥 Role-Based Access Control

PromptArc supports three roles:

```text
user
creator
admin
```

Authorization middleware verifies the authenticated user's role before allowing access to restricted APIs.

Role protection is performed on the backend and does not rely only on frontend route protection.

---

# 👤 User Role

A normal user can:

- Browse prompts
- Add prompts
- Manage own prompts
- Bookmark prompts
- Remove bookmarks
- Copy prompts
- Submit reviews
- Give ratings
- Report prompts
- View saved prompts
- View submitted reviews
- Manage profile
- Upgrade to Premium

Free users can create a maximum of:

```text
3 prompts
```

---

# 🎨 Creator Role

Creator accounts receive additional publishing and analytics functionality.

Creator capabilities include:

- Creator Dashboard
- Add Prompt
- My Prompts
- Update own prompts
- Delete own prompts
- Prompt analytics
- Total prompt statistics
- Total copies
- Total bookmarks
- Prompt growth analytics

Analytics are generated from MongoDB data.

---

# 🛡️ Admin Role

Administrators receive full platform-management functionality.

Admin capabilities include:

- View all users
- Search users
- Filter users
- Change user role
- Change account status
- Delete users
- View all prompts
- Search prompts
- Filter prompts
- Approve prompts
- Reject prompts
- Provide rejection feedback
- Delete prompts
- Feature prompts
- Unfeature prompts
- View payment records
- View reports
- Remove reported prompts
- Warn creators
- Dismiss reports
- View administrative analytics

Critical administrative operations are protected by server-side authorization.

---

# 📝 Prompt Management

Prompt data can contain:

- Prompt Title
- Prompt Description
- Prompt Content
- Category
- AI Tool
- Tags
- Difficulty Level
- Thumbnail
- Visibility
- Usage Instructions
- Creator
- Copy Count
- Bookmark Count
- Average Rating
- Status
- Created Date
- Updated Date

Newly created user/creator prompts are submitted with:

```text
status = pending
copyCount = 0
```

Pending prompts remain hidden from the public marketplace until reviewed by an administrator.

---

# ➕ Add Prompt

Users and creators can submit prompts using fields such as:

- Prompt title
- Prompt description
- Prompt content
- Category
- AI tool
- Tags
- Difficulty level
- Thumbnail
- Visibility
- Usage instructions

Supported difficulty levels include:

```text
Beginner
Intermediate
Pro
```

Supported visibility modes include:

```text
Public
Private
```

---

# ✅ Prompt Moderation

Administrators review pending prompts.

Admin actions include:

### Approve Prompt

Approved prompts become eligible to appear in the marketplace.

### Reject Prompt

Admins can reject prompts that do not meet platform requirements.

When rejecting a prompt, rejection feedback is provided.

### Delete Prompt

Admins can permanently remove prompts when necessary.

### Feature Prompt

Admins can mark selected prompts as featured.

Featured prompts can receive additional visibility on the platform.

---

# 🔖 Bookmark System

Authenticated users can bookmark prompts.

The backend supports:

- Add bookmark
- Remove bookmark
- Check bookmark status
- Saved Prompt listing
- Bookmark count synchronization

Duplicate bookmarks from the same user are prevented.

Example behavior:

```text
User bookmarks prompt
        ↓
Bookmark record is created
        ↓
Bookmark count increases
        ↓
Prompt appears in Saved Prompts
```

When removed:

```text
User removes bookmark
        ↓
Bookmark record is deleted
        ↓
Bookmark count decreases
        ↓
Prompt disappears from Saved Prompts
```

---

# 📋 Copy Prompt Tracking

When an eligible user copies a prompt:

- Prompt access is checked
- Prompt content is copied by the frontend
- Backend copy count is incremented
- Updated count is stored in MongoDB

Premium/private prompt content cannot be copied by users without Premium access.

---

# ⭐ Reviews & Ratings

Authenticated users who have access to the full prompt can submit:

- Rating
- Review comment

Review information includes:

- User name
- Email
- Rating
- Comment
- Date

Users can update their own review.

Prompt ratings are calculated dynamically from review data.

---

# 🚩 Prompt Reporting

Users can report prompts for reasons such as:

- Inappropriate Content
- Spam
- Copyright Violation

Users can also provide an optional description.

Reports are saved in the database and become available in the Admin Dashboard.

Admin actions include:

- Remove Prompt
- Warn Creator
- Dismiss / Not Harmful

---

# 💎 Premium Prompt Access

PromptArc supports:

```text
Public prompts
Private / Premium prompts
```

For normal free users, Premium prompts:

- Hide or lock prompt content
- Prevent prompt copying
- Prevent review/rating access
- Display Premium upgrade information

Premium users receive access to private prompt content.

---

# 💳 Stripe Payment System

PromptArc uses Stripe Checkout for a one-time:

```text
USD $5
```

Premium payment.

The payment flow includes:

```text
User chooses Premium
        ↓
Backend creates Stripe checkout session
        ↓
User completes Stripe payment
        ↓
Payment is verified
        ↓
Transaction is stored
        ↓
User subscription becomes Premium
        ↓
Private prompts become accessible
```

Stored transaction information can include:

- Transaction ID
- User email
- Amount
- Payment date
- Stripe session information

Duplicate payment-processing protection is implemented where required.

---

# 🔔 Stripe Webhook

The project contains support for a Stripe webhook route.

Example route:

```text
/api/payments/webhook
```

If webhook verification is enabled, configure:

```env
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

If the current payment flow does not use Stripe webhook verification, this variable is optional.

---

# ☁️ Cloudinary Image Upload

PromptArc uses Cloudinary for prompt thumbnail uploads.

The upload system includes:

- Multipart file handling
- File type validation
- File size validation
- Cloudinary upload
- Cloudinary URL storage
- Error handling

Multer is used for processing uploaded files.

Prompt thumbnails are stored using Cloudinary URLs and displayed by the frontend.

---

# 🔔 Notification System

PromptArc includes database-backed notifications.

Notifications can be generated for events such as:

- Account creation
- Welcome messages
- Prompt submission
- Prompt approval
- Prompt rejection
- Bookmark activity
- Review activity
- Reports
- Role changes
- Account status changes
- Premium activation

Users can:

- View notifications
- View unread count
- Mark a notification as read
- Mark all notifications as read

---

# 📊 Dashboard APIs

The backend provides data for three different dashboard experiences.

---

## 👤 User Dashboard

User Dashboard API data includes:

- Account overview
- Prompt statistics
- My Prompts
- Saved Prompts
- My Reviews
- Profile information
- Notifications

All dashboard data is loaded from MongoDB.

---

## 🎨 Creator Dashboard

Creator analytics include:

- Total Prompts
- Total Copies
- Total Bookmarks
- Prompt Growth
- Prompt Performance

Data is generated from the creator's real prompt records.

---

## 🛡️ Admin Dashboard

Admin analytics and management APIs include:

- Total Users
- Total Prompts
- Total Reviews
- Total Copies
- User management
- Prompt moderation
- Payment records
- Reports
- Platform activity

---

# 📈 MongoDB Aggregation

MongoDB aggregation is used for analytics and statistical features.

Examples include:

- Marketplace statistics
- Creator rankings
- Prompt ratings
- Top creators
- Creator analytics
- Prompt growth
- Admin analytics
- Dashboard statistics

This satisfies the project requirement to implement MongoDB aggregation in at least one feature.

---

# 🔍 Server-Side Search

Search functionality is implemented on the backend.

Prompts can be searched using:

- Prompt Title
- Tags
- AI Tool

Administrative/user-management APIs also contain backend search where required.

---

# 🎛️ Server-Side Filtering

Prompt filtering can include:

- Category
- AI Tool
- Difficulty Level
- Prompt Status
- Visibility

Administrative sections can apply additional filters depending on the resource type.

Filtering is performed on the server/database rather than only on the frontend.

---

# ↕️ Server-Side Sorting

Marketplace sorting supports:

- Most Popular
- Most Copied
- Latest

The backend performs the sorting before returning data to the frontend.

---

# 📄 Pagination

Pagination is implemented on multiple API-powered pages.

This improves:

- Performance
- Database efficiency
- Network usage
- Frontend rendering

Pagination is used on at least two required pages.

---

# 🗄️ Database

PromptArc uses:

```text
MongoDB Atlas
```

with:

```text
Mongoose
```

Main application records include:

- Users
- Prompts
- Bookmarks
- Reviews
- Reports
- Payments
- Notifications

---

# 🔒 Security

PromptArc includes multiple backend security measures:

- JWT authentication
- Password hashing
- Role-based authorization
- Google token verification
- Helmet security headers
- CORS configuration
- Rate limiting
- Request size limits
- File upload validation
- Environment variables
- Input validation
- Production-safe error handling
- Invalid MongoDB ID handling
- Duplicate-data safeguards
- Protected administrative actions

---

# 🌐 CORS Configuration

Frontend origins are configured using:

```env
CLIENT_URL
```

Production:

```env
CLIENT_URL=https://prompt-arc-frontend.vercel.app
```

Local development:

```env
CLIENT_URL=http://localhost:3000
```

The production frontend:

```text
https://prompt-arc-frontend.vercel.app
```

is allowed to communicate with:

```text
https://prompt-arc-backend.vercel.app
```

---

# 🧩 Main API Route Groups

The backend contains API groups including:

```text
/api/auth
/api/prompts
/api/dashboard
/api/payments
/api/uploads
/api/admin
```

---

# 🔐 Authentication APIs

Authentication routes handle operations such as:

```text
Register
Login
Google Login
Current User
Profile Update
Authentication Verification
```

---

# 📝 Prompt APIs

Prompt-related APIs handle:

```text
Prompt listing
Prompt details
Create prompt
Update prompt
Delete prompt
Bookmark prompt
Remove bookmark
Copy prompt
Review prompt
Rate prompt
Report prompt
Creator information
Marketplace search
Marketplace filtering
Marketplace sorting
Pagination
```

---

# 📊 Dashboard APIs

Dashboard routes provide data for:

```text
Overview
My Prompts
Saved Prompts
My Reviews
Profile
Creator Analytics
Notifications
```

---

# 🛡️ Admin APIs

Admin routes provide:

```text
All Users
Role Management
Account Status Management
User Deletion
All Prompts
Prompt Approval
Prompt Rejection
Prompt Deletion
Feature Prompt
Payments
Reports
Report Moderation
Admin Analytics
```

---

# 💳 Payment APIs

Payment routes provide:

```text
Stripe Checkout Session
Payment Verification
Payment Persistence
Premium Activation
Payment History
Webhook Handling
```

---

# 📤 Upload APIs

Upload routes handle:

```text
Prompt thumbnail upload
Cloudinary integration
File validation
Upload error handling
```

---

# 🩺 Health Check

Production health endpoint:

```text
https://prompt-arc-backend.vercel.app/api/health
```

Example response:

```json
{
  "status": "ok",
  "service": "promptarc-api",
  "timestamp": "..."
}
```

---

# ⚙️ Environment Variables

Create a file named:

```text
.env
```

inside the backend root directory.

Example:

```env
NODE_ENV=development

PORT=5000

CLIENT_URL=http://localhost:3000

MONGODB_URI=mongodb+srv://USERNAME:PASSWORD@YOUR_CLUSTER.mongodb.net/promptarc

JWT_SECRET=replace-with-a-secure-random-secret-at-least-32-characters

JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

STRIPE_SECRET_KEY=sk_test_replace_me

# Optional - only required when Stripe webhook verification is enabled
STRIPE_WEBHOOK_SECRET=whsec_replace_me

CLOUDINARY_CLOUD_NAME=replace_me
CLOUDINARY_API_KEY=replace_me
CLOUDINARY_API_SECRET=replace_me

ADMIN_NAME=PromptArc Admin
ADMIN_EMAIL=admin@promptarc.dev
ADMIN_PASSWORD=ChangeMe123!
```

---

# ⚠️ Environment Security

Never upload the real:

```text
.env
```

file to GitHub.

Sensitive information must remain inside:

- Local `.env`
- Vercel Environment Variables
- Secure deployment configuration

Never expose these values publicly:

```text
MONGODB_URI
JWT_SECRET
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CLOUDINARY_API_SECRET
```

Use:

```text
.env.example
```

for placeholder/example values.

---

# 📄 Example `.env.example`

A safe `.env.example` can contain:

```env
NODE_ENV=development

PORT=5000

CLIENT_URL=http://localhost:3000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_jwt_secret

JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your_google_client_id

STRIPE_SECRET_KEY=your_stripe_secret_key

STRIPE_WEBHOOK_SECRET=your_optional_webhook_secret

CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

ADMIN_NAME=PromptArc Admin
ADMIN_EMAIL=admin@promptarc.dev
ADMIN_PASSWORD=your_demo_admin_password
```

---

# 💻 Local Installation

## 1. Clone the Backend Repository

```bash
git clone https://github.com/kawsarNK/promptArc_backend
```

---

## 2. Enter the Project Directory

```bash
cd promptArc_backend
```

---

## 3. Install Dependencies

```bash
npm install
```

or:

```bash
npm ci
```

---

## 4. Create `.env`

Create:

```text
.env
```

in the project root.

Add the required environment variables.

---

## 5. Start Development Server

```bash
npm run dev
```

The backend should run locally at:

```text
http://localhost:5000
```

API base URL:

```text
http://localhost:5000/api
```

---

# ▶️ Production Start

Run:

```bash
npm start
```

---

# ✅ Source Validation

Run:

```bash
npm run check
```

---

# 🌱 Database Seed

If seed functionality is included in the project, run:

```bash
npm run seed
```

Use seed commands only when sample/demo database modifications are acceptable.

---

# ☁️ Vercel Deployment

The PromptArc backend is deployed on:

```text
Vercel
```

Production URL:

https://prompt-arc-backend.vercel.app

---

# 🚀 Deploy with Vercel CLI

Install Vercel CLI:

```bash
npm install -g vercel
```

Login:

```bash
vercel login
```

Deploy:

```bash
vercel
```

Deploy to production:

```bash
vercel --prod
```

---

# ⚙️ Production Environment Variables

Configure the following variables inside the backend Vercel project:

```env
NODE_ENV=production

CLIENT_URL=https://prompt-arc-frontend.vercel.app

MONGODB_URI=your-production-mongodb-atlas-uri

JWT_SECRET=your-production-jwt-secret

JWT_EXPIRES_IN=7d

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com

STRIPE_SECRET_KEY=your-stripe-secret-key

CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name

CLOUDINARY_API_KEY=your-cloudinary-api-key

CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Optional when Stripe webhook verification is used:

```env
STRIPE_WEBHOOK_SECRET=your-webhook-signing-secret
```

---

# 🌍 MongoDB Atlas Production Setup

Production uses MongoDB Atlas.

Deployment requirements include:

- MongoDB Atlas cluster
- Database user
- Strong database password
- MongoDB connection URI
- Correct Network Access configuration
- Secure environment variables

The MongoDB URI must never be included in public frontend code.

---

# 🔑 Google OAuth Production Setup

Google Login uses the same OAuth client configuration between the frontend and backend.

Production frontend origin:

```text
https://prompt-arc-frontend.vercel.app
```

Backend configuration:

```env
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

# 💳 Stripe Production/Test Configuration

Stripe secret keys belong only to the backend.

Backend:

```env
STRIPE_SECRET_KEY=sk_test_or_live_key
```

Never place an:

```text
sk_test_...
```

or:

```text
sk_live_...
```

key inside frontend code.

---

# ☁️ Cloudinary Configuration

Cloudinary credentials are stored only in the backend environment.

Required variables:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

---

# 🏗️ Project Architecture

```text
                     ┌───────────────────────────────┐
                     │        PromptArc User         │
                     └───────────────┬───────────────┘
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │       Next.js Frontend        │
                     │           Vercel              │
                     └───────────────┬───────────────┘
                                     │
                                  REST API
                                     │
                                     ▼
                     ┌───────────────────────────────┐
                     │       Express Backend         │
                     │           Vercel              │
                     └───────┬─────────┬─────────────┘
                             │         │
                 ┌───────────┘         └─────────────┐
                 ▼                                   ▼
         ┌───────────────┐                  ┌────────────────┐
         │ MongoDB Atlas │                  │     Stripe     │
         │   Database    │                  │    Payments    │
         └───────────────┘                  └────────────────┘
                 │
                 │
                 ▼
         ┌───────────────┐
         │  Cloudinary   │
         │ Image Storage │
         └───────────────┘
```

---

# 🔄 Full Authentication Flow

```text
User
 │
 ▼
Next.js Frontend
 │
 │ Login / Google Credential
 ▼
Express Backend
 │
 ├── Validate Request
 ├── Find/Create User
 ├── Verify Password / Google Token
 ├── Generate JWT
 │
 ▼
MongoDB Atlas
 │
 ▼
Authentication Response
 │
 ▼
Frontend Session
```

---

# 🔄 Prompt Submission Flow

```text
User / Creator
       │
       ▼
Add Prompt Form
       │
       ├── Thumbnail Upload
       │        │
       │        ▼
       │    Cloudinary
       │
       ▼
Express API
       │
       ▼
MongoDB
       │
       ▼
status = pending
       │
       ▼
Admin Review
   ┌───┴────┐
   ▼        ▼
Approve   Reject
   │        │
   ▼        ▼
Public   Feedback
```

---

# 🔄 Premium Payment Flow

```text
Free User
    │
    ▼
Premium Prompt
    │
    ▼
Upgrade to Premium
    │
    ▼
Stripe Checkout
    │
    ▼
Successful Payment
    │
    ▼
Backend Verification
    │
    ├── Save Transaction
    └── Update Subscription
              │
              ▼
          Premium User
              │
              ▼
     Private Prompt Access
```

---

# 🧪 Recommended Final Testing

Before submission or production release, verify:

- Registration
- Email login
- Google login
- JWT authentication
- Authentication persistence
- User role
- Creator role
- Admin role
- Free-user 3 prompt limit
- Add Prompt
- Thumbnail upload
- Prompt pending status
- Prompt approval
- Prompt rejection
- Rejection feedback
- Prompt editing
- Prompt deletion
- Search
- Filtering
- Sorting
- Pagination
- Bookmark
- Remove bookmark
- Bookmark count
- Saved Prompts
- Copy prompt
- Copy count
- Reviews
- Ratings
- Prompt reports
- Admin report moderation
- Premium prompt restriction
- Stripe Checkout
- Premium activation
- Payment storage
- Creator analytics
- Admin analytics
- User role changes
- User deletion
- Notifications
- Cloudinary upload
- MongoDB connection
- Production CORS
- API health route
- Direct frontend route reload

---

# 👨‍💼 Demo Admin Account

Use the following account to test Admin Dashboard functionality:

```text
Email: admin@promptarc.dev
Password: ChangeMe123!
```

> This credential is intended only for project demonstration/testing. Do not reuse this password for any sensitive personal or production account.

---

# 📋 Requirement Coverage

| Requirement | Status |
|---|---|
| Email/Password Authentication | ✅ |
| Google Authentication | ✅ |
| JWT Authentication | ✅ |
| Role-Based Access Control | ✅ |
| User Role | ✅ |
| Creator Role | ✅ |
| Admin Role | ✅ |
| Prompt CRUD | ✅ |
| Prompt Moderation | ✅ |
| Pending Prompt Status | ✅ |
| Admin Approval | ✅ |
| Admin Rejection | ✅ |
| Rejection Feedback | ✅ |
| Feature Prompt | ✅ |
| Bookmark System | ✅ |
| Duplicate Bookmark Protection | ✅ |
| Copy Count | ✅ |
| Reviews | ✅ |
| Ratings | ✅ |
| Report System | ✅ |
| Premium Prompt Access | ✅ |
| Stripe Payment | ✅ |
| Payment Records | ✅ |
| Cloudinary Upload | ✅ |
| MongoDB Atlas | ✅ |
| Server-Side Search | ✅ |
| Server-Side Filtering | ✅ |
| Server-Side Sorting | ✅ |
| Pagination | ✅ |
| MongoDB Aggregation | ✅ |
| User Analytics | ✅ |
| Creator Analytics | ✅ |
| Admin Analytics | ✅ |
| Notifications | ✅ |
| Security Middleware | ✅ |
| Rate Limiting | ✅ |
| CORS Configuration | ✅ |
| Production Deployment | ✅ |

---

# 🔗 Project Repositories

### Frontend Repository

https://github.com/kawsarNK/promptArc_frontend

### Backend Repository

https://github.com/kawsarNK/promptArc_backend

---

# 🌐 Production URLs

### Frontend

https://prompt-arc-frontend.vercel.app

### Backend

https://prompt-arc-backend.vercel.app

### Backend Health Check

https://prompt-arc-backend.vercel.app/api/health

---

# 👨‍💻 Author

**Md Kawsar Hamid**

Full-Stack Web Developer

---

# 📌 Project Status

```text
✅ Development Complete
✅ Frontend Deployed
✅ Backend Deployed
✅ MongoDB Atlas Connected
✅ Google Login Working
✅ Stripe Payment Working
✅ Cloudinary Upload Working
✅ Production CORS Configured
✅ Role-Based Dashboards Working
✅ Prompt Marketplace Working
```

---

# ⭐ PromptArc

**PromptArc** is a secure, modern, role-based AI prompt sharing and marketplace ecosystem built with:

```text
Next.js
React
Node.js
Express
MongoDB
Mongoose
JWT
Google Authentication
Stripe
Cloudinary
Vercel
```

The platform enables users to discover, create, save, review, purchase access to, and manage AI prompts while providing creators with analytics and administrators with complete moderation and management capabilities.

---

## 🙏 Thank You

Thank you for reviewing **PromptArc — AI Prompt Sharing & Marketplace Platform**.

Developed by:

**Md Kawsar Hamid**

Frontend:

https://prompt-arc-frontend.vercel.app

Backend:

https://prompt-arc-backend.vercel.app
