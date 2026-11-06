# AGENTS.md — VerityAI

## Project Overview

**Project Name:** VerityAI  
**Tagline:** Every Brand Decision, Verified.  
**Team:** NAIVA  
**Hackathon:** CodeNexus India 2026

VerityAI is an evidence-backed brand compliance platform that checks marketing content against approved brand guidelines, identifies potential inconsistencies, explains detected issues, and supports human review before publication.

**Core principle:**

"We don't just tell you it's wrong. We show you the rule, the evidence, and the fix."

## 1. Project Objectives

The application aims to:

- Verify marketing content against configured brand information.
- Detect product name and pricing inconsistencies.
- Identify predefined unsupported promotional claims.
- Explain why content has been flagged.
- Provide suggested corrections.
- Support human approval and review decisions.
- Maintain report and review history.

## 2. Technology Stack

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

### Development Environment
- Visual Studio Code
- Node.js and npm
- Python virtual environment
- Git and GitHub

## 3. Project Structure

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
├── AGENTS.md
└── README.md
```

Always inspect the existing project structure before creating, moving, or deleting files.

## 4. Backend Responsibilities

The backend is responsible for:

- Exposing REST API endpoints through FastAPI.
- Managing configured brand information.
- Running deterministic content verification rules.
- Generating structured analysis results.
- Storing reports in SQLite.
- Retrieving previously generated reports.
- Saving human review decisions and reviewer comments.

### Important API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/` | Backend status |
| GET | `/health` | Health check |
| GET | `/brand` | Retrieve brand information |
| POST | `/analyze` | Analyze submitted content |
| GET | `/reports` | Retrieve analysis reports |
| POST | `/reports/{report_id}/review` | Save review decision |

### Backend development rules

- Keep business logic in appropriate modules.
- Keep API route handling in `main.py`.
- Keep database operations in `database.py`.
- Keep brand configuration in `brand.py`.
- Keep compliance detection logic in `rules.py`.
- Validate API inputs and handle errors properly.
- Avoid hardcoding environment-specific configuration.
- Never expose credentials or secrets.

## 5. Frontend Responsibilities

The frontend provides the user interface for:

- Submitting marketing content.
- Displaying compliance analysis results.
- Showing detected issues and evidence.
- Displaying suggested corrections.
- Viewing previous reports.
- Reviewing submitted content.
- Approving, rejecting, or requesting changes.
- Recording reviewer comments.

### Frontend development rules

- Use TypeScript and existing project types.
- Follow the existing TanStack Start routing structure.
- Reuse existing components and utilities wherever possible.
- Keep API communication in `src/lib/api.ts`.
- Keep shared application state in `src/lib/store.ts` unless the architecture is deliberately changed.
- Handle loading, success, and error states.
- Maintain consistency with the existing UI design.
- Avoid unnecessary dependencies.

## 6. Current Verification Engine

The current engine is deterministic and rule-based.

It uses configured brand information and predefined rules to identify:

- Product name inconsistencies.
- Price mismatches.
- Configured unsupported promotional claims.

Each finding should provide relevant information such as:

- Issue category.
- Severity.
- Explanation.
- Evidence.
- Suggested correction or action.
- Resolution status.

### Important limitation

Do not describe the current implementation as a fully semantic AI system or claim that it understands every possible brand violation.

Do not invent detection capabilities that are not implemented and tested.

If new AI or semantic detection capabilities are added, clearly distinguish implemented features from planned features.

## 7. Human Review Workflow

The review workflow supports three decisions:

- `approved`
- `rejected`
- `changes_requested`

The backend uses `request_changes` as the corresponding stored status for `changes_requested`.

Review decisions should:

- Require a reviewer comment.
- Be submitted through the backend API.
- Be persisted in the database.
- Display the previous decision and reviewer comment.
- Provide clear success and error feedback.

Do not report a review as successfully saved unless the backend confirms the operation.

## 8. Database Guidelines

The current application uses SQLite.

The reports table stores:

- Report ID.
- Brand.
- Submitted content.
- Analysis result JSON.
- Creation timestamp.
- Review status.
- Reviewer comment.

Important:

- Never commit database files.
- Never delete or reset existing report data without explicit approval.
- Preserve existing database records when modifying the schema.
- Use migrations or safe schema updates when needed.
- Consider persistent database storage when deploying the application.

## 9. Security Guidelines

- Never commit `.env` files or API keys.
- Never expose credentials in frontend code.
- Keep virtual environments out of Git.
- Exclude local SQLite databases.
- Validate and sanitize user input.
- Configure appropriate CORS origins for production.
- Do not introduce unnecessary security-sensitive dependencies.

## 10. Development and Testing Guidelines

Before modifying existing functionality:

1. Inspect the relevant files.
2. Understand existing data flow.
3. Identify dependencies and affected routes.
4. Make the smallest appropriate change.
5. Preserve existing working functionality.
6. Test the affected feature.
7. Run the frontend production build when frontend code changes.

### Frontend build command

Run from `frontend/`:

```bash
npm run build
```

### Backend development command

Run from `backend/`:

```bash
python -m uvicorn main:app --reload
```

Test API endpoints using:

```text
http://127.0.0.1:8000/docs
```

## 11. Feature Status and Reporting

Always distinguish between:

- Planned
- In Progress
- Implemented
- Verified Working
- Partly Working
- Broken
- Not Tested
- Deferred

An implemented feature is not automatically a verified feature.

Never claim that a feature works without testing it.

When reporting changes, mention:

- Files modified.
- What changed.
- Why it changed.
- Tests performed.
- Any remaining limitations.

## 12. Planned Improvements

The following areas are future improvement goals:

1. **Evidence Accuracy** — Improve the quality and traceability of evidence supporting findings.
2. **Detection Reliability** — Expand detection coverage and improve handling of varied content.
3. **Review Workflow** — Improve reviewer collaboration and review management.

Do not mark these improvements as implemented until the corresponding work is completed and verified.

## 13. Instructions for AI Coding Agents

When working on VerityAI:

- Read this file and the README before making significant changes.
- Follow the existing architecture and coding conventions.
- Do not rewrite the entire application for a small feature.
- Do not remove working functionality.
- Do not change API response structures without checking frontend dependencies.
- Do not change database schemas without considering existing data.
- Do not add mock data to production workflows.
- Do not fabricate test results.
- Explain important changes in simple language.
- Ask before destructive operations.
- Prefer maintainable, understandable solutions over unnecessary complexity.

**Primary development priority:** Keep VerityAI functional, explainable, evidence-backed, and reliable.

---

**VerityAI — Every Brand Decision, Verified.**