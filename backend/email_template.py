"""
email_template.py
─────────────────
YOU own everything in this file.
Edit branding, colors, copy, CTA links, next steps — all here.
The only thing automation.py injects is the ai_feedback_block
string, which replaces the {{AI_FEEDBACK_BLOCK}} placeholder.
"""

# ── Brand config — edit freely ─────────────────────────────────────────────────
BRAND = {
    "company":         "CodeCelix",
    "tagline":         "Building AI for the world.",
    "primary":         "#9B1D3A",
    "bg":              "#0A0A0A",
    "surface":         "#111111",
    "border":          "#222222",
    "text":            "#F0F0F0",
    "text_mid":        "#888888",
    "portal_link":     "https://apply.codecelix.com",      # ← your frontend URL
    "contact_email":   "careers@codecelix.com",            # ← your email
}


def build_email(candidate: dict, ai_feedback_block: str) -> tuple[str, str]:
    """
    Returns (subject_line, full_html_body).

    candidate keys used: name, role, score, grade
    ai_feedback_block: HTML string from render_feedback_html() in automation.py
    """
    first = candidate["name"].split()[0]
    role  = candidate.get("role", "the role")
    score = candidate.get("score", "--")
    grade = candidate.get("grade", "--")
    b     = BRAND

    subject = f"You've been shortlisted, {first} — Next Steps from CodeCelix"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{subject}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{background:{b['bg']};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:{b['text']};-webkit-font-smoothing:antialiased}}
  .wrap{{max-width:600px;margin:0 auto;padding:32px 20px}}

  /* Header */
  .hdr{{display:flex;align-items:center;justify-content:space-between;padding-bottom:24px;border-bottom:1px solid {b['border']};margin-bottom:32px}}
  .logo{{font-size:17px;font-weight:900;letter-spacing:-0.5px;color:{b['text']}}}
  .logo span{{color:{b['primary']}}}
  .badge{{font-size:11px;font-weight:700;color:{b['primary']};background:rgba(155,29,58,.1);border:1px solid rgba(155,29,58,.3);border-radius:100px;padding:4px 12px;letter-spacing:.5px;text-transform:uppercase}}

  /* Greeting */
  .greet h1{{font-size:26px;font-weight:800;letter-spacing:-1px;color:{b['text']};margin-bottom:12px;line-height:1.2}}
  .greet p{{font-size:15px;color:{b['text_mid']};line-height:1.7;margin-bottom:28px}}

  /* Score card */
  .score-card{{background:{b['surface']};border:1px solid {b['border']};border-radius:14px;padding:20px 24px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between}}
  .score-lbl{{font-size:11px;font-weight:700;color:{b['text_mid']};text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}}
  .score-val{{font-size:36px;font-weight:900;color:{b['text']};letter-spacing:-2px}}
  .score-grade{{font-size:36px;font-weight:900;color:{b['primary']};letter-spacing:-2px}}
  .score-role{{font-size:13px;color:{b['text_mid']};font-weight:500;margin-top:4px}}

  /* Section label */
  .sec-lbl{{font-size:10px;font-weight:700;letter-spacing:2px;color:{b['text_mid']};text-transform:uppercase;margin-bottom:14px}}

  /* AI feedback block */
  .ai-block{{background:{b['surface']};border:1px solid {b['border']};border-radius:14px;padding:24px;margin-bottom:28px}}
  .ai-block .ai-summary{{font-size:15px;color:{b['text']};line-height:1.7;margin-bottom:20px}}
  .ai-block .ai-section-title{{font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:{b['text_mid']};margin-bottom:10px;margin-top:20px}}
  .ai-block .ai-section-title:first-of-type{{margin-top:0}}
  .ai-block ul{{list-style:none;padding:0}}
  .ai-block li{{display:flex;align-items:flex-start;gap:10px;font-size:14px;color:{b['text_mid']};line-height:1.6;margin-bottom:8px}}
  .ai-block li::before{{content:'';display:inline-block;width:6px;height:6px;border-radius:50%;background:{b['primary']};margin-top:7px;flex-shrink:0}}
  .ai-block .ai-recommendation{{font-size:14px;color:{b['text']};line-height:1.65;font-weight:500;background:rgba(155,29,58,.06);border-left:2px solid {b['primary']};padding:12px 16px;border-radius:0 8px 8px 0;margin-top:16px}}

  /* Next steps */
  .steps{{background:{b['surface']};border:1px solid {b['border']};border-radius:14px;padding:24px;margin-bottom:28px}}
  .step{{display:flex;gap:16px;margin-bottom:18px;align-items:flex-start}}
  .step:last-child{{margin-bottom:0}}
  .step-num{{width:26px;height:26px;border-radius:50%;background:rgba(155,29,58,.12);border:1px solid rgba(155,29,58,.3);color:{b['primary']};font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:26px}}
  .step-title{{font-size:14px;font-weight:700;color:{b['text']};margin-bottom:3px}}
  .step-sub{{font-size:13px;color:{b['text_mid']};line-height:1.5}}

  /* CTA */
  .cta-wrap{{text-align:center;margin-bottom:36px}}
  .cta{{display:inline-block;background:{b['primary']};color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:10px;letter-spacing:-0.2px}}

  /* Divider */
  .div{{height:1px;background:{b['border']};margin:28px 0}}

  /* Footer */
  .footer{{text-align:center}}
  .footer p{{font-size:12px;color:{b['text_mid']};line-height:1.8;margin-bottom:4px}}
  .footer a{{color:{b['text_mid']};text-decoration:underline}}
</style>
</head>
<body>
<div class="wrap">

  <!-- HEADER — edit logo text, badge label here -->
  <div class="hdr">
    <div class="logo">CODE<span>CELIX</span></div>
    <span class="badge">Application Update</span>
  </div>

  <!-- GREETING — edit headline and intro copy here -->
  <div class="greet">
    <h1>Hey {first}, you've been shortlisted.</h1>
    <p>
      Your application for <strong style="color:{b['text']}">{role}</strong> at CodeCelix
      has been reviewed by our team. Here's a full breakdown of your screening results.
    </p>
  </div>

  <!-- SCORE CARD — auto-filled from Supabase data, no edit needed -->
  <div class="score-card">
    <div>
      <div class="score-lbl">AI Score</div>
      <div class="score-val">{score}<span style="font-size:18px;color:{b['text_mid']}">/100</span></div>
      <div class="score-role">{role}</div>
    </div>
    <div style="text-align:right">
      <div class="score-lbl">Grade</div>
      <div class="score-grade">{grade}</div>
    </div>
  </div>

  <!-- AI FEEDBACK BLOCK — generated by Groq, injected here -->
  <!-- To change what the AI writes, edit FEEDBACK_PROMPT in automation.py -->
  <p class="sec-lbl">Screening Feedback</p>
  <div class="ai-block">
    {ai_feedback_block}
  </div>

  <!-- NEXT STEPS — edit these freely, they are 100% yours -->
  <p class="sec-lbl">What Happens Next</p>
  <div class="steps">
    <div class="step">
      <div class="step-num">1</div>
      <div>
        <div class="step-title">Technical Interview</div>
        <div class="step-sub">You'll receive a calendar invite within 2 business days for a 30-minute call with one of our engineers.</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">2</div>
      <div>
        <div class="step-title">Prepare Your Portfolio</div>
        <div class="step-sub">Have your GitHub or portfolio ready. We'll ask you to walk through 1–2 of your projects live.</div>
      </div>
    </div>
    <div class="step">
      <div class="step-num">3</div>
      <div>
        <div class="step-title">Final Decision</div>
        <div class="step-sub">We move fast. You'll hear back with a final answer within 5 business days of your interview.</div>
      </div>
    </div>
  </div>

  <!-- CTA — edit link and button text here -->
  <div class="cta-wrap">
    <a href="{b['portal_link']}" class="cta">View Application Portal →</a>
  </div>

  <div class="div"></div>

  <!-- FOOTER — edit company info and links here -->
  <div class="footer">
    <p><strong style="color:{b['text']}">{b['company']}</strong><br/>{b['tagline']}</p>
    <p style="margin-top:10px">Questions? Reply to this email or reach us at <a href="mailto:{b['contact_email']}">{b['contact_email']}</a></p>
    <p style="margin-top:6px">© 2025 {b['company']} · NASTP, Rawalpindi</p>
  </div>

</div>
</body>
</html>"""

    return subject, html