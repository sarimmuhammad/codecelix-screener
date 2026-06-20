# CodeCelix AI Screener — Setup Guide

## Project Structure
```
codecelix-screener/
├── frontend/
│   ├── src/
│   │   ├── App.jsx          ← Full React UI
│   │   └── main.jsx         ← Entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env                 ← VITE_API_URL
│
├── backend/
│   ├── main.py              ← FastAPI (all endpoints)
│   ├── requirements.txt
│   └── .env                 ← API keys
│
└── supabase_schema.sql      ← Run once in Supabase
```

---

## Step 1 — Supabase Setup

1. Go to https://supabase.com → create free project
2. Go to SQL Editor → paste contents of `supabase_schema.sql` → Run
3. Go to Project Settings → API → copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (not anon!) → `SUPABASE_SERVICE_KEY`

Mobile dashboard: Open supabase.com on your phone → Table Editor → applications table. You'll see all candidates, scores, verdicts live.

---

## Step 2 — Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Fill in your .env file
# ANTHROPIC_API_KEY = your claude key
# SUPABASE_URL = from step 1
# SUPABASE_SERVICE_KEY = from step 1

# Run
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000
Test it: http://localhost:8000/docs (auto Swagger UI)

---

## Step 3 — Frontend Setup

```bash
cd frontend

npm install

# Edit .env — set VITE_API_URL
# Local:      VITE_API_URL=http://localhost:8000
# Production: VITE_API_URL=https://your-api.railway.app

npm run dev
```

Frontend runs at: http://localhost:3000

---

## Step 4 — Production Deployment

### Backend → Railway (free tier)
1. Push backend folder to GitHub
2. Go to railway.app → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Railway gives you a URL like `https://codecelix-screener.railway.app`
5. Update frontend `.env`: `VITE_API_URL=https://codecelix-screener.railway.app`

### Frontend → Vercel (free)
1. Push frontend folder to GitHub
2. Go to vercel.com → Import project
3. Add env variable: `VITE_API_URL=your-railway-url`
4. Deploy → get URL like `https://apply.codecelix.com`

---

## Customizing Questions

Open `frontend/src/App.jsx` and scroll to `QUESTION_BANKS` at the top.

Each role has its own array of questions. To change questions for a job posting:
- Edit the array for that role
- `followUp: true` on first question means AI generates a follow-up from the answer
- All other questions are shown as-is

Example — add a new question to AI Engineering:
```js
{
  id: "deployment",
  question: "How do you deploy and monitor your AI systems in production?",
}
```

---

## What You See in Supabase Dashboard

Each row = one candidate submission:
| Column | What it is |
|---|---|
| name / email / whatsapp | Contact info |
| role | Which role they applied for |
| score | 0–100 AI score |
| grade | A / B / C / D |
| verdict | Hire / Maybe / Reject |
| strengths | Array of strengths |
| concerns | Array of red flags |
| summary | 2-3 sentence AI summary |
| recommended_next_step | What to do next |
| transcript | Full Q&A readable text |

Sort by `score desc` to see top candidates first.

---

## API Endpoints Summary

| Method | Endpoint | What it does |
|---|---|---|
| GET | / | Health check |
| POST | /generate-followup | AI follow-up from open answer |
| POST | /upload-cv | Extract text + generate 2 CV questions |
| POST | /generate-github-question | Question from GitHub URL |
| POST | /submit | Score + save to Supabase |

---

## Scaling Notes (200-300 applicants/day)

- FastAPI is async — handles concurrent requests well
- Railway free tier: 500 hours/month (upgrade to $5/mo Hobby for production)
- Supabase free tier: 500MB storage, 2GB bandwidth — enough for thousands of applications
- Anthropic API: claude-sonnet-4-6 is fast (~2-3 sec per call)
- CV upload: files are processed in-memory and not stored (only text saved in Supabase)

---

## .gitignore (add before pushing to GitHub)

```
# Backend
backend/.env
backend/venv/
backend/__pycache__/
backend/*.pyc

# Frontend
frontend/.env
frontend/node_modules/
frontend/dist/
```
