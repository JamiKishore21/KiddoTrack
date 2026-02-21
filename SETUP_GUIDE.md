# KiddoTrack - Setup Guide

## 1. Google Client ID Setup (Authentication)

To enable "Sign in with Google", you need a Google Cloud Project.

1.  **Go to Google Cloud Console**: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2.  **Create a New Project**: Click the dropdown in the top-left and select "New Project". Name it `KiddoTrack`.
3.  **Configure OAuth Consent Screen**:
    - Go to **APIs & Services** > **OAuth consent screen**.
    - Select **External** (for testing) or **Internal**.
    - Fill in App Name ("KiddoTrack"), User Support Email, and Developer Contact Info.
    - Click **Save and Continue** (you can skip Scopes for now).
4.  **Create Credentials**:
    - Go to **APIs & Services** > **Credentials**.
    - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
    - Application Type: **Web application**.
    - Name: `KiddoTrack Client`.
    - **Authorized JavaScript origins**: `http://localhost:5173` (This is your frontend URL).
    - Click **CREATE**.
5.  **Copy the Client ID**:
    - It will look like `123456789-abcdefg.apps.googleusercontent.com`.
6.  **Paste into Project**:
    - **Frontend**: Open `client/src/main.jsx` and replace `"PLACEHOLDER_CLIENT_ID_FROM_GOOGLE_CONSOLE"` with your ID.
    - **Backend**: Open `server/.env` and replace `PLACEHOLDER_CLIENT_ID` with your ID.

---

## 2. MongoDB Database Connection

This project uses **MongoDB** to store user and bus data.

### Option A: Local MongoDB (Recommended for Development)
If you have MongoDB Community Server installed on your computer:
1.  **Start MongoDB**: Open a terminal and run `mongod` (or ensure the background service is running).
2.  **Verify Connection String**:
    - Open `server/.env`.
    - Ensure `MONGO_URI=mongodb://localhost:27017/kiddotrack`.
    - That's it! The app will automatically create the database `kiddotrack`.

### Option B: MongoDB Atlas (Cloud)
If you prefer a cloud database:
1.  Go to [MongoDB Atlas](https://www.mongodb.com/atlas/database) and create a free cluster.
2.  Click **Connect** > **Drivers** > **Node.js**.
3.  Copy the connection string (e.g., `mongodb+srv://<username>:<password>@cluster0.mongodb.net/kiddotrack`).
4.  Open `server/.env` and paste it into `MONGO_URI`.
    - Replace `<username>` and `<password>` with your actual Atlas credentials.

---

## 3. Starting the Project

**Backend Terminal**:
```bash
cd server
npm run dev
```

**Frontend Terminal**:
```bash
cd client
npm run dev
```
