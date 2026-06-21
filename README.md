# DealSense AI - Intelligent Retail Price Comparison & Alerts

DealSense AI is an intelligent retail price tracking, alerts, and comparison platform. It monitors products from various online platforms, records historical pricing trends, offers AI-driven buying recommendations, sends notifications, and delivers automated email alerts.

---

## Production Setup & Deployment Guide

This guide describes how to configure and deploy DealSense AI for production.

### 1. Prerequisites
Ensure you have the following installed and set up:
- **Node.js** (v18.x or later)
- **npm** (v10.x or later) or similar package manager
- **MongoDB** (Local instance for development or a MongoDB Atlas cluster for production)
- **Resend** account (optional, for email delivery)

---

### 2. Dependency Installation
Clone the repository and install the project dependencies:
```bash
git clone <your-repo-url>
cd dealsense-ai
npm install
```

---

### 3. Setup Environment Variables
Copy the template configuration file to configure your local credentials:
```bash
cp .env.example .env.local
```
Fill in the following required variables inside `.env.local`:
- `MONGODB_URI`: The connection URI for your database.
- `JWT_SECRET`: A secure, secret key for signing auth cookies.
- `EMAIL_PROVIDER`: Set to `resend` for production emails or `mock` to log emails in the console.
- `RESEND_API_KEY`: API key from your Resend dashboard (required if using `resend`).
- `EMAIL_FROM`: The verified sender address (e.g. `DealSense AI <onboarding@resend.dev>`).
- `NEXT_PUBLIC_APP_URL`: The URL of your application (e.g. `https://your-domain.vercel.app` or `http://localhost:3000`).
- `GEMINI_API_KEY`: Gemini API key for the AI Recommendation Engine.

---

### 4. Setup MongoDB Atlas (Production Database)
To set up a cloud-hosted database on MongoDB Atlas:
1. **Create an Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign up.
2. **Build a Cluster**: Create a new database cluster (the free M0 tier is suitable for testing/demo).
3. **Database Access**: Under Security, create a new Database User with password-based authentication.
4. **Network Access**: Add an IP address entry (for Vercel deployment, select `Allow Access from Anywhere` or `0.0.0.0/0`).
5. **Get Connection String**: Click **Connect** on your cluster, select **Drivers**, and copy the connection string. Replace `<db_password>` with your user's password.
6. **Set Variable**: Paste this string as your `MONGODB_URI` environment variable.

---

### 5. Setup Email Provider (Resend)
If you want real-time email alerts when price targets are hit or when a user signs up:
1. **Create an Account**: Register at [Resend](https://resend.com).
2. **Get API Key**: Create an API key on the Resend dashboard and set it as `RESEND_API_KEY`.
3. **Set Sender**: Specify a sender email in `EMAIL_FROM`. For testing, you can use Resend's default sender `onboarding@resend.dev` to deliver to your own registered email address.
4. **Verify Domain (Recommended)**: For production, verify your custom domain in Resend's settings to send emails to any recipient.

---

### 6. Run Locally
Start the local development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

- To build and run the production bundle locally:
```bash
npm run build
npm run start
```

---

### 7. Deployment to Vercel
Vercel is the recommended hosting platform for Next.js applications.

1. **Push to GitHub**: Commit your project changes and push them to a remote Git repository (GitHub/GitLab/Bitbucket).
2. **Import Project**: Log in to [Vercel](https://vercel.com) and click **Add New** > **Project**. Select your repository.
3. **Configure Settings**:
   - Framework Preset: **Next.js**
   - Root Directory: `./` (default)
4. **Environment Variables**:
   Add the following variables in the Vercel project configuration:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `EMAIL_PROVIDER`
   - `RESEND_API_KEY` (if using Resend)
   - `EMAIL_FROM` (if using Resend)
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel deployment URL)
   - `GEMINI_API_KEY`
5. **Deploy**: Click **Deploy**. Vercel will build and launch your application.

---

### 8. Health Check & Diagnostics
The app provides a health check endpoint for monitoring deployment status:
- **Endpoint**: `GET /api/health`
- **Output JSON**:
  ```json
  {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-06-21T06:00:00.000Z"
  }
  ```
This endpoint connects to the database, validates connectivity, and returns `500 Internal Server Error` if the database goes down or is misconfigured.
