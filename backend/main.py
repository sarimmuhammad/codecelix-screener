"""
CodeCelix AI Screener — FastAPI Backend
Groq llama-3.1-8b-instant for fast question generation
Anthropic claude-sonnet-4-6 for final scoring only
"""
import re
import json
import os, json, uuid, tempfile
from datetime import datetime, timezone
from typing import Optional
from groq import Groq
import pdfplumber
import docx2txt
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client



# ── Clients ───────────────────────────────────────────────────────────────────
groq_client   = Groq(api_key=os.environ["GROQ_API_KEY"])
supabase: Client = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

app = FastAPI(title="CodeCelix Screener API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Email scheduler (runs daily at 09:00 UTC) ─────────────────────────────────
from scheduler import start_scheduler
start_scheduler()

# ── Reference question themes — Groq uses these as INSPIRATION, not copy ─────
REFERENCE_THEMES = {
  "AI Engineering": [
    "How candidate handles retrieval systems (vector DBs, chunking, search quality)",
    "How candidate approaches low-latency real-time AI pipelines (voice/streaming)",
    "How candidate debugs non-deterministic AI failures in production",
    "How candidate scopes and delivers an end-to-end AI automation for a client",
  ],
  "Web Development": [
    "How candidate architects scalable APIs and handles high traffic",
    "How candidate approaches debugging hard-to-reproduce production issues",
    "How candidate manages client projects from kickoff to delivery",
    "How candidate makes build-vs-buy decisions on a solo or small team",
  ],
  "UI/UX Design": [
    "How candidate approaches design with zero user research available",
    "How candidate handles developer pushback on design feasibility",
    "How candidate designs for non-technical or first-time digital users",
    "How candidate manages design handoffs and design system consistency",
  ],
}

# ── Validation helpers ────────────────────────────────────────────────────────
def validate_phone(phone: str) -> bool:
    """Exactly 11 digits (digits only after stripping spaces/dashes)."""
    digits = "".join(c for c in phone if c.isdigit())
    return len(digits) == 11

def validate_email(email: str) -> bool:
    """Must contain @ and a dot after the @."""
    if "@" not in email:
        return False
    local, _, domain = email.partition("@")
    return bool(local) and "." in domain and not domain.startswith(".") and not domain.endswith(".")

def validate_github(url: str) -> bool:
    """Must be a recognisable URL (http/https) or at least contain a dot."""
    url = url.strip()
    if url.startswith("http://") or url.startswith("https://"):
        return True
    # allow plain domains like github.com/username or behance.net/...
    return "." in url and len(url) > 4

# ── Validation endpoint ───────────────────────────────────────────────────────
class ValidateRequest(BaseModel):
    field: str   # "phone" | "email" | "github"
    value: str

@app.post("/validate")
def validate_field(req: ValidateRequest):
    field = req.field.lower()
    if field == "phone":
        ok = validate_phone(req.value)
        return {"valid": ok, "message": "" if ok else "Phone number must be exactly 11 digits."}
    elif field == "email":
        ok = validate_email(req.value)
        return {"valid": ok, "message": "" if ok else "Please enter a valid email address (e.g. you@example.com)."}
    elif field == "github":
        ok = validate_github(req.value)
        return {"valid": ok, "message": "" if ok else "Please enter a valid URL or portfolio link."}
    return {"valid": True, "message": ""}
def safe_json_load(raw: str):
    try:
        return json.loads(raw)
    except:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise
# ── Groq fast call ────────────────────────────────────────────────────────────
def groq(prompt: str, system: str = "", max_tokens: int = 600) -> str:
    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs.append({"role": "user", "content": prompt})
    resp = groq_client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=msgs,
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return resp.choices[0].message.content.strip()

# ── Claude scoring call ───────────────────────────────────────────────────────
def groq_score(prompt: str) -> str:
    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "You are a strict JSON-only recruiter API. Return ONLY valid JSON. No explanation. No markdown."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.6,
        top_p=0.9,
        max_tokens=1200
    )
    return resp.choices[0].message.content.strip()
# ── CV extraction ─────────────────────────────────────────────────────────────
def extract_cv(path: str, filename: str) -> str:
    ext = filename.lower().split(".")[-1]
    text = ""
    if ext == "pdf":
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                t = page.extract_text()
                if t: text += t + "\n"
    elif ext in ("doc", "docx"):
        text = docx2txt.process(path)
    return text.strip()[:6000]

# ── Models ────────────────────────────────────────────────────────────────────
class ProjectQRequest(BaseModel):
    role: str
    project_answer: str

class CVQuestionRequest(BaseModel):
    role: str
    project_answer: str
    cv_text: str

class GithubQRequest(BaseModel):
    role: str
    github_url: str
    name: str

class PersonalInfo(BaseModel):
    name: str; whatsapp: str; email: str; city: str

class QA(BaseModel):
    question: str; answer: str

class ProjectQA(BaseModel):
    answer: str
    followups: list[QA]

class SubmitRequest(BaseModel):
    personal: PersonalInfo
    role: str
    project_qa: ProjectQA
    cv_text: str
    cv_qa: list[QA]
    ref_qa: list[QA]
    github: str
    github_qa: QA
    transcript: list[dict]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "CodeCelix Screener API ✅"}


@app.post("/generate-project-questions")
def generate_project_questions(req: ProjectQRequest):
    prompt = f"""You are a senior technical interviewer at CodeCelix hiring for {req.role}.

A candidate described their most complex project:
\"\"\"{req.project_answer}\"\"\"

Generate exactly 2 sharp follow-up questions that:
- Dig into specific technical claims or decisions they actually mentioned
- Reveal depth of understanding (not just surface knowledge)
- Are conversational, 1-2 sentences each
- Do NOT ask generic questions — reference something specific from their answer

Respond ONLY with a JSON array of 2 strings. No markdown, no backticks:
["question 1", "question 2"]"""

    raw = groq(prompt)
    try:
        qs = json.loads(raw)
        if not isinstance(qs, list) or len(qs) < 2:
            raise ValueError
    except:
        qs = [
            "What was the single hardest technical decision you made in that project, and what alternatives did you consider?",
            "If you had to rebuild it from scratch today, what would you do completely differently and why?",
        ]
    return {"questions": qs}


@app.post("/generate-ref-questions")
def generate_ref_questions(req: CVQuestionRequest):
    themes = REFERENCE_THEMES.get(req.role, REFERENCE_THEMES["AI Engineering"])
    themes_text = "\n".join(f"- {t}" for t in themes)

    prompt = f"""You are a senior technical interviewer at CodeCelix hiring for {req.role}.

Here is what you know about the candidate so far:

PROJECT THEY DESCRIBED:
{req.project_answer[:800]}

CV SUMMARY:
{req.cv_text[:1200] if req.cv_text else "Not available"}

Your goal is to generate exactly 2 interview questions. Use these THEMES as inspiration for what to probe — but make each question specific to THIS candidate based on what you know about them:

THEMES TO EXPLORE:
{themes_text}

Rules:
- Reference something real from their background if possible
- Questions should feel natural in a conversation, not like a form
- 1-2 sentences each
- Reveal actual skill depth, not just surface answers

Respond ONLY with a JSON array of 2 strings. No markdown, no backticks:
["question 1", "question 2"]"""

    raw = groq(prompt)
    try:
        qs = json.loads(raw)
        if not isinstance(qs, list) or len(qs) < 2:
            raise ValueError
    except:
        qs = [
            "How do you decide what to build yourself versus use an existing tool or API?",
            "Walk me through how you'd scope and kick off a new client project in your first week.",
        ]
    return {"questions": qs}


@app.post("/upload-cv")
async def upload_cv(file: UploadFile = File(...)):
    ext = file.filename.lower().split(".")[-1]
    if ext not in {"pdf", "doc", "docx"}:
        raise HTTPException(400, "Only PDF or Word files accepted.")

    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    try:
        cv_text = extract_cv(tmp_path, file.filename)
    finally:
        os.unlink(tmp_path)

    if not cv_text:
        return {"cv_text": "", "questions": [
            "Walk me through your most recent role and what you actually built.",
            "Which experience on your CV pushed your technical skills the most?",
        ]}

    prompt = f"""You are a technical interviewer at CodeCelix reviewing this CV:

{cv_text}

Generate exactly 2 interview questions that:
- Reference something SPECIFIC from this CV (a company name, project, or technology actually mentioned)
- Are technical or experience-focused
- Sound like a recruiter who actually read it carefully

Respond ONLY with a JSON array of 2 strings. No markdown, no backticks:
["question 1", "question 2"]"""

    raw = groq(prompt)
    try:
        qs = json.loads(raw)
        if not isinstance(qs, list) or len(qs) < 2:
            raise ValueError
    except:
        qs = [
            "Walk me through your most impactful project from your CV and the key technical decisions you made.",
            "You've worked across multiple roles — what's the biggest technical skill you picked up that wasn't in your job description?",
        ]
    return {"cv_text": cv_text, "questions": qs}


@app.post("/generate-github-question")
def generate_github_question(req: GithubQRequest):
    prompt = f"""You are a technical recruiter at CodeCelix interviewing {req.name} for {req.role}.

They shared: {req.github_url}

Write ONE question (1-2 sentences) that asks them to highlight their best or most technically interesting work from their GitHub or portfolio. Make it feel natural and specific to a {req.role} candidate.

Reply with ONLY the question, no intro."""

    q = groq(prompt, max_tokens=150)
    return {"question": q}


@app.post("/submit")
def submit(data: SubmitRequest):
    app_id = str(uuid.uuid4())
    submitted_at = datetime.now(timezone.utc).isoformat()

    lines = [
        f"CodeCelix Screener — {data.personal.name} — {data.role}",
        f"Submitted: {submitted_at}", "",
        f"CONTACT: {data.personal.whatsapp} | {data.personal.email} | {data.personal.city}", "",
        "=== PROJECT ===",
        f"A: {data.project_qa.answer}", "",
    ]

    for fu in data.project_qa.followups:
        lines += [f"Q: {fu.question}", f"A: {fu.answer}", ""]

    lines.append("=== CV QUESTIONS ===")
    for qa in data.cv_qa:
        lines += [f"Q: {qa.question}", f"A: {qa.answer}", ""]

    lines.append("=== REFERENCE QUESTIONS ===")
    for qa in data.ref_qa:
        lines += [f"Q: {qa.question}", f"A: {qa.answer}", ""]

    lines += [
        "=== GITHUB ===",
        f"Link: {data.github}",
        f"Q: {data.github_qa.question}",
        f"A: {data.github_qa.answer}"
    ]

    transcript_text = "\n".join(lines)

    score_prompt = f"""
You are a senior technical recruiter at CodeCelix evaluating a {data.role} candidate.

EVALUATION RULES:
- Be strict and realistic
- Weak answers → low score
- Strong answers → high score
- Consider technical depth, clarity, and problem solving

TRANSCRIPT:
{transcript_text}

Return ONLY valid JSON:

{{
  "score": 0,
  "grade": "A/B/C/D",
  "verdict": "Hire/Maybe/Reject",
  "strengths": [],
  "concerns": [],
  "summary": "2-3 sentence evaluation",
  "next_step": "actionable advice"
}}
"""

    try:
        raw = groq_score(score_prompt)
        report = safe_json_load(raw)
    except Exception as e:
        print("[SCORING ERROR]", e)
        report = {
            "score": -1,
            "grade": "ERROR",
            "verdict": "Parse Failed",
            "strengths": [],
            "concerns": ["Model JSON invalid or parsing failed"],
            "summary": "System error during scoring.",
            "next_step": "Check Groq output format"
        }

    row = {
        "id": app_id,
        "submitted_at": submitted_at,
        "name": data.personal.name,
        "email": data.personal.email,
        "whatsapp": data.personal.whatsapp,
        "city": data.personal.city,
        "role": data.role,
        "github": data.github,
        "score": report.get("score"),
        "grade": report.get("grade"),
        "verdict": report.get("verdict"),
        "strengths": report.get("strengths"),
        "concerns": report.get("concerns"),
        "summary": report.get("summary"),
        "recommended_next_step": report.get("next_step"),
        "transcript": transcript_text,
        "full_report": report
    }

    try:
        supabase.table("applications").insert(row).execute()
    except Exception as e:
        print(f"[Supabase error] {e}")

    return {"status": "submitted", "application_id": app_id}