# Deployment Guide

## Quick Deploy (Free Tier)

### 1. ML Service → Render.com
1. Push your code to GitHub
2. Go to https://render.com → "New Static Site" → select your repo
3. Set:
   - Build Command: `pip install -r requirements-deploy.txt`
   - Start Command: `python app.py`
   - Environment: Python 3.11
4. Create environment variable:
   - `PYTHONUNBUFFERED=1`
5. Deploy and copy the URL (e.g., `https://stocksense-ml.onrender.com`)

### 2. Backend → Render.com
1. Go to https://render.com → "New Web Service"
2. Connect your GitHub repo (backend folder)
3. Set:
   - Build Command: `./mvnw -DskipTests clean package`
   - Start Command: `java -jar target/backend-0.0.1-SNAPSHOT.jar`
   - Environment: Java 21
4. Deploy and copy the URL

### 3. Frontend → Vercel.com
1. Go to https://vercel.com → Import Project
2. Select your repo (frontend folder)
3. Add environment variables:
   - `VITE_API_URL=https://your-backend-url.onrender.com/api`
   - `VITE_ML_API_URL=https://your-ml-url.onrender.com`
4. Deploy

### 4. Update Frontend API URLs
After deploying, update the environment variables in Vercel to point to your deployed backend and ML service URLs.

---

## Alternative: All-in-One on Railway
1. Go to https://railway.app
2. Create 3 services (Python, Java, Node)
3. Deploy each part separately
4. Use Railway's networking to connect services

---

## Required Environment Variables

### Frontend (.env)
```
VITE_API_URL=https://your-backend.onrender.com/api
VITE_ML_API_URL=https://your-ml-service.onrender.com
```

### Backend
- Spring Boot handles most config automatically
- Add database URL if using persistent storage

### ML Service
```
PYTHONUNBUFFERED=1
```
