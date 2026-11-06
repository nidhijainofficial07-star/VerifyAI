# VerityAI — Every Brand Decision, Verified.

**Evidence-Backed Explainable Brand Compliance**

VerityAI is a brand compliance checking platform that helps teams verify marketing content against approved brand guidelines before publication.

It identifies potential brand inconsistencies, highlights supporting evidence, explains detected issues, and provides suggested corrections so teams can make informed content decisions.

> We don't just tell you it's wrong. We show you the rule, the evidence, and the fix.

## Problem

Marketing teams create content across multiple platforms, making it difficult to consistently follow brand guidelines.

Common challenges include:
- Incorrect product pricing or details.
- Unsupported promotional claims.
- Inconsistent product terminology.
- Content that does not match approved brand information.
- Lack of transparency about why something was flagged.

## Our Solution

VerityAI provides a structured content verification workflow.

1. **Content Analysis** — Submit marketing content for verification.
2. **Rule-Based Detection** — Check content against configured brand information and compliance rules.
3. **Evidence-Based Findings** — Identify the relevant text and explain why it was flagged.
4. **Suggested Corrections** — Provide guidance for resolving detected issues.
5. **Human Review** — Allow reviewers to approve, reject, or request changes.
6. **Report History** — Store analysis reports and review decisions.

## Key Features

- Brand guideline-based content verification.
- Product name and pricing consistency checks.
- Detection of configured unsupported promotional claims.
- Severity-based issue classification.
- Evidence and explanation for detected findings.
- Suggested corrections and actions.
- Human-in-the-loop review workflow.
- Approve, reject, and request-changes decisions.
- Reviewer comments and decision history.
- Analysis reports with overall compliance status.

## Example

**Sample Brand: SmartDesk**

| Brand guideline | Approved information |
|---|---|
| Product name | SmartDesk |
| Approved price | ₹5,000 |
| Product feature | Height adjustable |
| Product description | Ergonomic workstation for everyday use |

**Sample content:**

"Introducing SmartDesk, the No. 1 ergonomic desk in India! Get yours today for just ₹4,000. Our revolutionary desk guarantees 100% productivity improvement."

**Expected findings:**

- **Price mismatch:** The advertised price of ₹4,000 does not match the approved price of ₹5,000.
- **Unsupported claim:** "No. 1 ergonomic desk in India" requires human verification.
- **Unsupported claim:** "100% productivity improvement" requires human verification.

VerityAI highlights these findings and provides explanations to support the review process.

## Technology Stack

### Frontend
- React
- TypeScript
- TanStack Start
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLite
- REST API

### Development Tools
- Visual Studio Code
- Git and GitHub
- npm
- Python virtual environment

## Project Architecture

```text
VerityAI/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── brand.py
│   └── rules.py
│
├── frontend/
│   ├── src/
│   │   ├── routes/
│   │   └── lib/
│   ├── package.json
│   └── vite.config.ts
│
├── public/
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- Python 3.10+
- Git

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd VerifyAI
```

### 2. Start the backend

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows PowerShell**
```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
python -m uvicorn main:app --reload
```

Backend API: `http://127.0.0.1:8000`

API documentation: `http://127.0.0.1:8000/docs`

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite in your terminal.

## Testing and Verification

The following scenarios have been manually tested:

| Test scenario | Expected result | Status |
|---|---|---|
| Clean content | No compliance issues | Verified |
| Incorrect product price | Price mismatch detected | Verified |
| Unsupported promotional claims | Findings flagged for human review | Verified |
| Approve review decision | Decision saved | Verified |
| Reject review decision | Decision saved | Verified |
| Request changes | Decision and reviewer comment saved | Verified |

## Current Implementation

VerityAI currently uses a deterministic, rule-based verification engine.

It checks content against configured brand information and predefined compliance rules. Human review is used for findings that require further verification.

The current implementation does not claim to provide full semantic understanding or autonomous legal/compliance approval.

## Future Improvements

Planned areas for improvement:

1. **Evidence Accuracy** — Improve the relevance and traceability of evidence behind each finding.
2. **Detection Reliability** — Expand detection coverage and improve handling of varied content.
3. **Review Workflow** — Improve reviewer collaboration, decision tracking, and report management.

## Project Information

**Project:** VerityAI  
**Team:** NAIVA  
**Hackathon:** CodeNexus India 2026  
**Category:** AI for Everyday Life

---

**VerityAI — Every Brand Decision, Verified.**