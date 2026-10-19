# CampusHQ School ERP — Railway Backend Deployment Guide

This guide details the deployment configuration and environment variables required to run the CampusHQ School ERP backend on Railway with MongoDB Atlas and the Vercel frontend.

---

## 1. Railway Service Settings

In your [Railway Project](https://railway.com/) backend service:

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Root Directory** | `/backend` (or `backend`) | Scopes builds, dependencies, and start scripts to the backend directory |
| **Build Command** | `npm install` (default Nixpacks / Node) | Installs backend dependencies from package.json |
| **Start Command** | `npm start` | Executes `node src/server.js` |
| **Health Check Path** | `/health` | Returns `200 OK` `{"status":"ok","database":"connected","systemInitialized":true}` |
| **Restart Policy** | `On Failure` (Max retries: 5) | Restarts automatically if transient errors occur |

---

## 2. Required Environment Variables (Railway Dashboard > Service > Variables)

Configure the following variables in the **Variables** tab of your Railway Backend Service:

| Variable | Required | Example / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE` | **Yes** | `mongodb+srv://<username>:<password>@cluster0.fzeutel.mongodb.net/campushq?retryWrites=true&w=majority` | Full MongoDB Atlas connection string. (Note: `MONGODB_URI` is also accepted as fallback). |
| `JWT_SECRET` | **Yes** | *(64-character random string)* | Secret key used for signing and verifying JSON Web Tokens (session auth). |
| `NODE_ENV` | **Yes** | `production` | Sets Node to production mode (enables performance optimizations & CORS protection). |
| `PORT` | Auto | *(Injected automatically by Railway)* | Express listens on `process.env.PORT` on `0.0.0.0`. Do not override with a fixed port. |
| `FRONTEND_URL` | Optional | `https://campus-hq-school-erp.vercel.app` | Allowed frontend origin for CORS. Multiple origins can be comma-separated. |
| `WEBSITE_URL` | Optional | `https://campus-hq-school-erp.vercel.app` | Secondary allowed origin for CORS. |
| `PUBLIC_SERVER_FILE` | Optional | `https://<your-backend-service>.up.railway.app/` | Public base URL for uploaded file assets and PDF invoice branding logos. |

---

## 3. MongoDB Atlas Manual Configuration Checklist

Before redeploying on Railway, verify these settings in your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/):

1. **Network Access (IP Whitelist):**
   * Go to **Security > Network Access**.
   * Ensure `0.0.0.0/0` (Allow Access From Anywhere) is present and has status **Active**.
   * *Why?* Railway container instances use dynamic cloud outbound IP addresses. Without `0.0.0.0/0` (or a dedicated static proxy), Atlas rejects incoming TCP/TLS connections on port 27017.
2. **Credential Rotation & Security:**
   * Rotate the database user password in **Security > Database Users**.
   * Ensure special characters in `<password>` (`@`, `:`, `/`, `?`, `#`, `%`) are properly URL-encoded.
   * Ensure the database user has **Read and write to any database** (or explicitly on the `campushq` database).
3. **Cluster Status:**
   * Verify cluster `cluster0.fzeutel.mongodb.net` is active (not paused).

---

## 4. Frontend Configuration (Vercel)

In your [Vercel Project Dashboard](https://vercel.com/) under **Settings > Environment Variables**:

| Variable | Required | Value |
| :--- | :---: | :--- |
| `VITE_BACKEND_SERVER` | **Yes** | `https://<your-backend-service>.up.railway.app` |
| `VITE_FILE_BASE_URL` | Optional | `https://<your-backend-service>.up.railway.app` |

---

## 5. Railway Deployment Verification

1. In Railway Dashboard, open your backend service.
2. Under **Variables**, verify `DATABASE` and `JWT_SECRET` are set.
3. In **Settings > Networking**, click **Generate Domain** if not already created (provides `https://<service-name>.up.railway.app`).
4. Trigger a deploy or push to `main`.
5. Observe the deployment logs:
   ```text
   Connecting to MongoDB (host: cluster0.fzeutel.mongodb.net, target database: "campushq")...
   Connected to MongoDB successfully (host: cluster0.fzeutel.mongodb.net, active database: "campushq")
   Express running → On PORT : <railway_port> (host: 0.0.0.0)
   ```
6. Check health check:
   ```bash
   curl -i https://<your-backend-service>.up.railway.app/health
   ```
