"""
automation.py
─────────────
Fetches shortlisted candidates from Supabase,
generates AI feedback via Groq,
sends branded HTML email via Gmail SMTP,
marks email_sent = true.

Railway-safe: no module-level client init.
"""

import os
import json
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone
from functools import lru_cache

from dotenv import load_dotenv
from groq import Groq
from supabase import create_client, Client

load_dotenv()

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger(__name__)

# ── Required env vars — checked at runtime, not import time ───────────────────
REQUIRED_VARS = [
    "GROQ_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "GMAIL_USER",
    "GMAIL_APP_PASS",
]

def check_env() -> None:
    missing = [v for v in REQUIRED_VARS if not os.getenv(v)]
    if missing:
        raise RuntimeError(f"[automation] Missing env vars: {', '.join(missing)}")


# ── Lazy clients (created once on first use, not at import) ───────────────────
@lru_cache(maxsize=1)
def get_groq() -> Groq:
    return Groq(api_key=os.getenv("GROQ_API_KEY"))

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(
        os.getenv("SUPABASE_URL"),
        os.getenv("SUPABASE_SERVICE_KEY"),
    )

def gmail_user() -> str:
    return os.getenv("GMAIL_USER", "")

def gmail_pass() -> str:
    return os.getenv("GMAIL_APP_PASS", "")


# ── Step 1: Fetch candidates ───────────────────────────────────────────────────
def fetch_shortlisted() -> list[dict]:
    result = (
        get_supabase()
        .table("applications")
        .select(
            "id, name, email, role, score, grade, verdict, "
            "strengths, concerns, summary, recommended_next_step"
        )
        .eq("shortlisted", True)
        .eq("email_sent", False)
        .order("submitted_at", desc=True)
        .execute()
    )
    candidates = result.data or []
    log.info(f"Found {len(candidates)} candidate(s) to email.")
    return candidates


# ── Step 2: Generate AI feedback via Groq ─────────────────────────────────────
FEEDBACK_PROMPT = """You are a professional technical recruiter writing candidate feedback for CodeCelix.

Use ONLY the data provided below. Do NOT invent facts. Do NOT add generic motivational filler.
Do NOT write exaggerated praise. Be concise, honest, and professional.

Candidate data:
- Role: {role}
- Score: {score}/100
- Grade: {grade}
- Verdict: {verdict}
- Strengths: {strengths}
- Concerns: {concerns}
- Summary: {summary}
- Recommended next step: {recommended_next_step}

Return ONLY a JSON object with exactly these four fields:
{{
  "candidate_summary": "2-3 sentences summarizing the candidate based strictly on their evaluation.",
  "key_strengths": ["strength 1", "strength 2", "strength 3"],
  "areas_for_improvement": ["area 1", "area 2"],
  "personalized_recommendation": "1-2 sentences of honest, specific advice for their technical interview."
}}

Rules:
- Pull strengths directly from the strengths array, rephrase naturally, max 3 items
- Pull improvements from concerns array, phrase constructively, max 2 items
- Recommendation must be specific to their role and actual concerns — not generic
- Return ONLY valid JSON. No markdown. No explanation. No backticks."""


def generate_ai_feedback(candidate: dict) -> dict:
    prompt = FEEDBACK_PROMPT.format(
        role=candidate.get("role", "the applied role"),
        score=candidate.get("score", "N/A"),
        grade=candidate.get("grade", "N/A"),
        verdict=candidate.get("verdict", "N/A"),
        strengths=json.dumps(candidate.get("strengths") or []),
        concerns=json.dumps(candidate.get("concerns") or []),
        summary=candidate.get("summary") or "No summary available.",
        recommended_next_step=candidate.get("recommended_next_step") or "Not recorded.",
    )
    try:
        resp = get_groq().chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.4,
            max_tokens=600,
        )
        raw = resp.choices[0].message.content.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        log.warning(f"Groq fallback for {candidate.get('name', '?')}: {e}")
        return {
            "candidate_summary": candidate.get("summary") or "Evaluation completed.",
            "key_strengths": candidate.get("strengths") or [],
            "areas_for_improvement": candidate.get("concerns") or [],
            "personalized_recommendation": candidate.get("recommended_next_step") or "",
        }


# ── Step 3: Render feedback as HTML ───────────────────────────────────────────
def render_feedback_html(fb: dict) -> str:
    strengths_html    = "".join(f"<li>{s}</li>" for s in (fb.get("key_strengths") or []))
    improvements_html = "".join(f"<li>{a}</li>" for a in (fb.get("areas_for_improvement") or []))
    rec = fb.get("personalized_recommendation", "")
    rec_html = f'<p class="ai-recommendation">{rec}</p>' if rec else ""
    return f"""
<p class="ai-summary">{fb.get("candidate_summary", "")}</p>
<p class="ai-section-title">Key Strengths</p>
<ul>{strengths_html}</ul>
<p class="ai-section-title">Areas to Develop</p>
<ul>{improvements_html}</ul>
{rec_html}"""


# ── Step 4: Send via Gmail SMTP ───────────────────────────────────────────────
def send_email(to_email: str, subject: str, html_body: str) -> bool:
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"]    = f"CodeCelix Careers <{gmail_user()}>"
        msg["To"]      = to_email
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(gmail_user(), gmail_pass())
            smtp.sendmail(gmail_user(), to_email, msg.as_string())

        log.info(f"  ✓ Sent → {to_email}")
        return True
    except Exception as e:
        log.error(f"  ✗ Failed → {to_email}: {e}")
        return False


# ── Step 5: Mark email_sent = true ────────────────────────────────────────────
def mark_sent(candidate_id: str) -> None:
    try:
        get_supabase().table("applications").update(
            {"email_sent": True}
        ).eq("id", candidate_id).execute()
    except Exception as e:
        log.error(f"  ✗ mark_sent failed for {candidate_id}: {e}")


# ── Main ───────────────────────────────────────────────────────────────────────
def run() -> None:
    from email_template import build_email

    check_env()  # ← fails loud + clear if anything missing

    log.info("=" * 55)
    log.info(f"CodeCelix Email Automation — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}")
    log.info("=" * 55)

    candidates   = fetch_shortlisted()
    sent, failed = 0, 0

    for c in candidates:
        log.info(f"Processing: {c.get('name', '?')}")
        try:
            feedback      = generate_ai_feedback(c)
            ai_html       = render_feedback_html(feedback)
            subject, html = build_email(c, ai_html)
            success       = send_email(c["email"], subject, html)
            if success:
                mark_sent(c["id"])
                sent += 1
            else:
                failed += 1
        except Exception as e:
            log.error(f"  ✗ Skipped {c.get('name', '?')}: {e}")
            failed += 1

    log.info(f"Done. Sent: {sent}  Failed: {failed}")
    log.info("=" * 55)


if __name__ == "__main__":
    run()