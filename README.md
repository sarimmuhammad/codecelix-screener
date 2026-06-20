# AI Candidate Screener

An AI-powered candidate screening tool built with React and the Anthropic Claude API. Recruiters define a job role and requirements — the AI then conducts a structured interview, evaluates responses, and delivers a hire/maybe/reject verdict with reasoning.

> Built during my AI Engineer internship at **CodeCelix** (NASTP, Rawalpindi)

---

## Features

- **Role Setup** — Define job title, required skills, and experience level
- **AI-Driven Interview** — Claude generates relevant screening questions based on the role
- **Multi-turn Conversation** — Natural back-and-forth Q&A flow
- **Intelligent Evaluation** — AI scores candidate answers and provides structured feedback
- **Final Verdict** — Hire / Maybe / Reject with detailed reasoning
- **No Backend Required** — Runs fully client-side in the browser

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React (JSX), Tailwind CSS |
| AI Model | Claude Sonnet (`claude-sonnet-4-6`) via Anthropic API |
| API | Anthropic `/v1/messages` endpoint |
| Deployment | Claude Artifacts sandbox / Static hosting |

---

## Getting Started

### Prerequisites

- Node.js 18+
- Anthropic API key → [Get one here](https://console.anthropic.com/)

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/ai-candidate-screener.git
cd ai-candidate-screener
npm install
```

### Environment Setup

Create a `.env` file in the root:

```env
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

### Run

```bash
npm run dev
```

---

## How It Works

```
User sets job role + requirements
        ↓
Claude generates tailored screening questions
        ↓
Candidate answers each question
        ↓
Claude evaluates all responses
        ↓
Final verdict: Hire / Maybe / Reject + reasoning
```

### API Call Pattern

```js
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1000,
    system: `You are an expert recruiter screening candidates for the role of ${jobRole}. 
             Required skills: ${requirements}. 
             Ask focused, role-specific questions and evaluate answers professionally.`,
    messages: conversationHistory  // full history sent each turn
  })
});
```

---

## Project Structure

```
ai-candidate-screener/
├── src/
│   ├── App.jsx          # Main component + state management
│   ├── components/
│   │   ├── RoleSetup.jsx      # Job role input form
│   │   ├── Interview.jsx      # Chat-style Q&A interface
│   │   └── Verdict.jsx        # Final evaluation display
│   └── index.css
├── .env.example
├── index.html
└── README.md
```

---

## 📸 Screenshots

> *(Add screenshots here)*

---

## Future Improvements

- [ ] Export screening report as PDF
- [ ] Support multiple candidates in one session
- [ ] Custom question bank per company
- [ ] Urdu language support for local Pakistani market
- [ ] Integration with HR management systems

---

## Author

**Muhammad Saaram**  
AI Engineer | CS Final Year @ PMAS Arid Agriculture University, Rawalpindi  
Internship: CodeCelix — NASTP, Rawalpindi

[![GitHub](https://img.shields.io/badge/GitHub-Profile-black?logo=github)](https://github.com/sarimmuhammad)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Connect-blue?logo=linkedin)](https://linkedin.com/in/MuhammadSaaram)

---

## License

MIT License — free to use and modify.
