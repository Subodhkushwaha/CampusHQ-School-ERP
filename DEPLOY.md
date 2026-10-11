# CampusHQ School ERP — Render Deployment Guide

This guide details the deployment configuration and environment variables required to run the CampusHQ School ERP backend on Render.

---

## 1. Render Web Service Settings

| Setting | Value | Description |
| :--- | :--- | :--- |
| **Runtime** | `Node` | Node.js 20+ runtime |
| **Root Directory** | `backend` | **Critical:** Scopes builds and start commands to the backend directory |
| **Build Command** | `npm install` | Installs backend production dependencies |
| **Start Command** | `npm start` | Executes `node src/server.js` |
| **Health Check Path** | `/health` | Returns `200 OK` `{ "status": "ok", "database": "connected" }` |
| **Auto Deploy** | `Yes` | Deploys on git push to `main` |

---

## 2. Required Environment Variables (Render Dashboard > Environment)

Configure the following variables in the **Environment** tab of your Render Web Service:

| Variable | Required | Example / Recommended Value | Description |
| :--- | :---: | :--- | :--- |
| `DATABASE` | **Yes** | `mongodb+srv://<user>:<password>@cluster0.lmgftc8.mongodb.net/campushq?retryWrites=true&w=majority` | Full MongoDB connection string. Must start with `mongodb://` or `mongodb+srv://` and point to the cluster containing the `campushq` database. |
| `JWT_SECRET` | **Yes** | `secure_random_64_character_hex_or_alphanumeric_secret` | Secret key used for signing and verifying JSON Web Tokens (session auth). Must not be empty. |
| `NODE_ENV` | **Yes** | `production` | Sets Node to production mode (enables performance optimizations & strict CORS). |
| `PORT` | **Yes** | `10000` | Port on which Express listens. Render defaults to `10000`. |
| `NODE_VERSION` | **Yes** | `20.18.0` | Ensures Render builds and runs with Node.js 20. |
| `FRONTEND_URL` | Optional | `https://your-frontend.vercel.app` | Allowed frontend origin for CORS. Multiple origins can be comma-separated. |
| `WEBSITE_URL` | Optional | `https://your-frontend.vercel.app` | Secondary allowed origin for CORS. |
| `PUBLIC_SERVER_FILE` | Optional | `https://campushq-backend.onrender.com/` | Public base URL for uploaded file and PDF assets. |

---

## 3. MongoDB Atlas Manual Configuration Checklist

Before redeploying on Render, verify these three settings in your [MongoDB Atlas Dashboard](https://cloud.mongodb.com/):

1. **Network Access (IP Whitelist):**
   * Go to **Security > Network Access**.
   * Ensure `0.0.0.0/0` (Allow Access From Anywhere) is present and has status **Active**.
   * *Why?* Render web services use dynamic outbound IP addresses that change on deploy and restart. Without `0.0.0.0/0`, Atlas's reverse proxy will reject incoming TLS connections with fatal TLS alerts.
2. **Cluster Running State:**
   * Ensure your cluster is **Active** (not paused, undergoing maintenance, or provisioning).
3. **Target Database in Connection URI:**
   * Ensure the URI path explicitly targets `/campushq`:
     `mongodb+srv://<user>:<password>@cluster0.lmgftc8.mongodb.net/campushq?retryWrites=true&w=majority`
   * Ensure the database user has **Read and write to any database** (or read/write on the `campushq` database).
   * Ensure special characters in `<password>` (such as `@`, `:`, `#`, `%`) are URL-encoded.

---

## 4. Redeployment Steps

1. In Render Dashboard, open your web service.
2. Under **Environment**, verify or set the variables listed in Section 2.
3. Click **Save Changes**.
4. Click **Manual Deploy** > **Deploy latest commit**.
5. Observe the deployment logs:
   ```text
   Connecting to MongoDB (host: cluster0.lmgftc8.mongodb.net, target database: "campushq")...
   Connected to MongoDB successfully (host: cluster0.lmgftc8.mongodb.net, active database: "campushq")
   Express running → On PORT : 10000
   ```
