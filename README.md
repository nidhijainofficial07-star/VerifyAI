# VerityAI — Every Brand Decision, Verified.

**An evidence-focused brand compliance and governance platform.**

VerityAI helps teams check whether their content follows approved brand information, identify inconsistencies and manage compliance decisions through a structured human-review workflow.

**Team:** NAIVA  
**Project:** VerityAI  
**Hackathon:** CodeNexus India 2026 — Round 2

---

## 🌐 Live Application

- **Frontend:** https://frontend-roan-omega-94.vercel.app/
- **Backend:** https://verityai-backend-bsbo.onrender.com/
- **GitHub Repository:** https://github.com/nidhijainofficial07-star/VerifyAI

---

## 💡 About the Project

Maintaining consistent brand communication becomes difficult when content is created by different people and teams.

Incorrect product information, outdated prices and unsupported promotional claims can reach customers before anyone notices.

VerityAI addresses this problem by comparing submitted content against approved brand information and generating compliance findings that can be reviewed by authorised users.

The current version focuses on explainable, rule-based verification and a backend-supported review workflow.

---

## ✨ Features

- **User Authentication:** Secure registration and login using JWT authentication and Argon2 password hashing.
- **Role-Based Access:** Separate access for Creators, Reviewers and Admins.
- **Brand Reference Information:** Approved SmartDesk product details and pricing.
- **Content Analysis:** Text-based checks for incorrect prices and unsupported promotional claims.
- **Compliance Findings:** Explanations, severity levels and suggested corrections.
- **Report Management:** Automatically generated reports stored in the database.
- **Review Center:** Reviewers can approve, reject or request changes to submissions.
- **Reviewer Comments:** Decisions and comments are saved in the backend.
- **Dashboard:** Displays report statistics and recent activity.
- **Admin Dashboard:** Provides platform statistics and user-role management.

---

## 🔐 Demo Login Credentials

You can use the following demo accounts to explore the application.

| Role | Email | Password |
|---|---|---|
| Creator | test@teamspace.com | teamspace123 |
| Reviewer 1 | reviewer@example.com | review@12345 |
| Reviewer 2 | reviewer2@example.com | review12345 |
| Admin | mailflow1407@gmail.com | mailflowdemo |

**How to sign in:**
1. Open the live application.
2. Navigate to the login page.
3. Enter the credentials for the role you want to explore.
4. Sign in to access the corresponding dashboard.

*Note: These should be dedicated demo accounts with non-sensitive credentials. Do not use personal passwords or production secrets.*

---

## ⚙️ Technology Stack

### Frontend
- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS

### Backend
- Python
- FastAPI
- JWT Authentication (HS256)
- Argon2 Password Hashing

### Database
- PostgreSQL
- Neon

### Deployment
- Vercel — Frontend
- Render — Backend

---

## 🔄 How VerityAI Works

1. **Content Submission:** A Creator submits text for compliance analysis.
2. **Verification:** The analyzer compares the submitted content against approved brand information.
3. **Issue Detection:** Incorrect product prices and unsupported promotional claims are identified.
4. **Report Generation:** Findings are presented with explanations, severity levels and suggested corrections.
5. **Human Review:** An authorised Reviewer examines the report and makes a decision.
6. **Decision Storage:** The review decision and comments are saved in the backend.

---

## 🧠 Current Analyzer Approach

The current version uses a deterministic, rule-based analyzer rather than an LLM.

This approach focuses on checks that can be explained and verified against approved brand information.

For example, if the approved SmartDesk price is ₹5,000 but submitted content mentions ₹4,000, VerityAI flags the mismatch.

The final compliance decision remains under human control.

---

## 🛠️ Local Setup

### Prerequisites
- Node.js and npm
- Python
- Access to a configured PostgreSQL database

### Frontend

```bash
git clone https://github.com/nidhijainofficial07-star/VerifyAI.git
cd VerifyAI
npm install
npm run dev
```

### Backend

The backend is built with Python and FastAPI.

Install the backend dependencies using the project's requirements file, configure the required environment variables and database connection, and start the FastAPI application.

*Refer to the backend project configuration for the exact dependency and startup commands.*

---

## ⚠️ Current Limitations

VerityAI is currently an MVP, and some proposed features are still under development.

- Image, screenshot, video and visual document analysis are not implemented.
- Gemini-based semantic interpretation and RAG-based retrieval are not included.
- Individual issue-level correction decisions are not yet persisted.
- Complete corrected-content generation and version history are pending.
- Reopening completed reviews is not supported.
- Full reviewer identity and review timestamps are not yet displayed in report details.

---

## 🚀 Future Improvements — Round 3

1. **Better Evidence and Traceability:** Link each finding to the exact approved brand guideline or information used during verification.
2. **More Reliable Detection:** Expand compliance checks and evaluate accuracy by measuring missed issues and false positives.
3. **Complete Review Workflow:** Add persistent issue-level corrections, review reopening and a detailed decision history.

---

## 👩‍💻 Project Ownership

**Team NAIVA**

**Nidhi Rakesh Jain**

Individual Project Lead & Developer

VerityAI was planned and developed as an individual project for CodeNexus India 2026.

---

**VerityAI — Every Brand Decision, Verified.**
