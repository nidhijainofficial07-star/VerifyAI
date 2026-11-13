# VerityAI — Every Brand Decision, Verified.

**An Evidence-Focused Brand Compliance and Governance Platform**

VerityAI is a brand compliance platform that helps organisations verify submitted content against approved brand information, identify potentially misleading or inconsistent claims, and manage content approvals through a structured human-review workflow.

It combines deterministic rule-based content analysis, structured brand knowledge, evidence traceability, risk assessment and human decision-making.

**Team:** NAIVA  
**Project:** VerityAI  
**Hackathon:** CodeNexus India 2026 — Final Round

---

## 🌐 Live Application

- **Frontend:** https://frontend-roan-omega-94.vercel.app/
- **Backend:** https://verityai-backend-bsbo.onrender.com/
- **GitHub Repository:** https://github.com/nidhijainofficial07-star/VerifyAI
- **Presentation:** https://drive.google.com/file/d/13FHDvqEZG2WU73yUzkEmTYpN4NWaprMj/view?usp=drive_link

---

## 💡 About VerityAI

Maintaining consistent brand communication becomes challenging when multiple creators and teams produce content.

Incorrect product names, outdated pricing, restricted terminology and unsupported promotional claims can reach customers before anyone notices.

VerityAI addresses this problem by checking submitted content against brand reference information and identifying potential compliance issues.

The platform provides three main user roles:

- **Admin:** Manages brand knowledge, platform users and reviewer access.
- **Creator:** Submits content, views compliance reports, receives feedback and resubmits corrected content.
- **Reviewer:** Examines reports, provides feedback and makes final review decisions.

VerityAI focuses on explainable, deterministic verification while keeping final compliance decisions under human control.

---

## ✨ Features

### 1. Authentication and Role-Based Access

- User registration and login.
- JWT-based authentication using HS256.
- Argon2 password hashing.
- Separate access and dashboards for Admins, Creators and Reviewers.
- Multiple Creator and Reviewer accounts.
- Reviewer registration and administrative approval/rejection workflow.
- Role-based protection of administrative functionality.
- Protected access to application features.

### 2. Admin – Brand Knowledge Management

Admins can manage the brand reference information used by the compliance workflow.

**Brand Guidelines**
- Add and manage brand policies.
- Define compliance requirements and severity levels.
- Maintain rules for claims, pricing, terminology and product communication.

**Product Facts**
- Add and manage approved product names.
- Maintain product descriptions and specifications.
- Store approved product pricing.
- Maintain reference information for different products.

**Terminology Management**
- Define preferred terminology.
- Identify restricted or incorrect terms.
- Specify approved alternative wording.
- Maintain consistent brand language.

**Document Management**
- Upload and register brand guideline documents.
- Manage advertising compliance reference documents.
- Maintain document records in the brand knowledge interface.

**User and Reviewer Management**
- Manage platform user roles.
- Handle reviewer registration approval or rejection.
- Control access to reviewer functionality.

The demonstration uses a sample SmartDesk brand profile containing product information, guidelines, terminology and advertising compliance documents.

### 3. Creator – Content Submission and Analysis

Creators can:

- Access their personal dashboard.
- Submit content for compliance analysis.
- Provide a separate content title and content body.
- Select the content type.
- View generated compliance reports.
- See detected issues and severity levels.
- Inspect explanations, approved information and suggested actions.
- View reviewer decisions and feedback.
- Edit content when changes are requested.
- Resubmit corrected content for another review.
- Access their submission history.

The original submitted content is preserved in the report rather than being silently overwritten during editing.

### 4. Deterministic Compliance Analysis Engine

VerityAI uses a Python-based deterministic, rule-based analyzer.

The analyzer includes several components:

**Input Quality Analysis**
- Checks for empty or invalid content.
- Identifies repeated-character patterns.
- Detects unusual consonant-heavy text patterns.

**Claim Analysis**
- Detects unsupported No. 1 and market-leading claims.
- Identifies unsupported superlatives such as best, safest, fastest and cheapest.
- Detects certain numerical performance guarantees.
- Identifies claims such as clinically proven and award-winning that require supporting evidence.
- Includes checks to reduce false positives in certain negated claims.

**Product and Pricing Analysis**
- Checks product-related information against available brand references.
- Identifies potential product-name mismatches.
- Detects advertised price mismatches.
- Supports checks involving approved promotional pricing and discount information.

**Terminology and Promotional Claim Checks**
- Identifies restricted terminology and comparative claims.
- Flags unsupported promotional statements.
- Provides explanations and suggested corrective actions.

**Issue Deduplication**
- Identifies duplicate findings so repeated detections do not unnecessarily inflate the report.

### 5. Risk Scoring and Compliance Reports

Each content analysis generates a structured compliance report.

Reports include:

- Total detected issues.
- Issue categories.
- Severity levels.
- Overall risk level.
- Explanations of detected issues.
- Original content associated with findings.
- Available approved brand information.
- Evidence or source references.
- Suggested corrective actions.

The risk-scoring component uses weighted severity values:

| Severity | Weight |
|---|---:|
| High | 30 |
| Medium | 15 |
| Low | 5 |

The weighted score is capped at 100 and used to determine the report's risk classification.

The risk score is a rule-based heuristic, not a statistical probability of non-compliance.

### 6. Evidence Traceability

VerityAI provides supporting information for detected findings where available.

Depending on the issue, a report can display:

- Approved product information.
- Approved pricing information.
- Relevant brand reference information.
- The detected claim or terminology.
- The source of the finding, such as the SmartDesk brand profile or Admin-managed information.
- A suggested action for addressing the issue.

This helps Creators and Reviewers understand why a finding was generated instead of receiving only a risk score.

### 7. Reviewer – Review Center

Reviewers have access to a shared review workflow for submitted content.

The Review Center allows reviewers to:

- View reports awaiting review.
- Open individual compliance reports.
- Inspect detected issues and severity.
- Examine the supporting information.
- Enter required reviewer comments.
- Make a final decision.

Available decisions:

**Approve**
- Approves the submitted content.

**Request Changes**
- Returns the content to the Creator with feedback.
- Allows the Creator to edit and resubmit the content.

**Reject**
- Rejects the submitted content.

Reviewer decisions and comments are saved as part of the backend-supported review workflow.

### 8. Review History and Activity

The platform supports review-related tracking, including:

- Review decisions.
- Reviewer comments.
- Report review statuses.
- Review history records.
- Reviewer activity information.
- Notifications associated with supported submission and resubmission events.

The review workflow keeps automated analysis separate from the final human approval decision.

### 9. Edit and Resubmit Workflow

VerityAI supports a complete correction cycle.

1. A Creator submits content.
2. The analyzer generates a compliance report.
3. A Reviewer examines the report.
4. The Reviewer requests changes and provides a comment.
5. The Creator opens the report and views the feedback.
6. The Creator edits the content.
7. The Creator resubmits the revised content.
8. The backend resets the previous pending-review fields and makes the revised submission available for another review.
9. The revised submission can go through the review process again.

The resubmission workflow preserves the review history and triggers the configured reviewer and administrator notifications.

---

## 📊 Dashboards

### Admin Dashboard

Provides administrative access to platform information and brand knowledge management.

Includes available administrative statistics, brand configuration and reviewer/user management functionality.

### Creator Dashboard

Displays:

- Total content checks.
- Issues detected.
- Pending reviews.
- Approved content.
- Recent content activity.
- Links to content analysis and brand information.

### Reviewer Dashboard

Provides access to the review workspace, pending reports and available review activity information.

The dashboard and Review Center help reviewers manage incoming submissions and their decisions.

---

## 🔄 How VerityAI Works

```text
                  ADMIN
                    |
                    v
           BRAND KNOWLEDGE SETUP
          +----------------------+
          | Brand Guidelines     |
          | Product Facts        |
          | Terminology          |
          | Documents            |
          +----------------------+
                    |
                    v
                  CREATOR
                    |
                    v
             CONTENT SUBMISSION
                    |
                    v
           COMPLIANCE ANALYZER
          +----------------------+
          | Input Quality        |
          | Claim Detection      |
          | Product Checks       |
          | Price Analysis       |
          | Terminology Checks   |
          | Risk Scoring         |
          +----------------------+
                    |
                    v
             COMPLIANCE REPORT
          +----------------------+
          | Detected Issues      |
          | Severity             |
          | Evidence             |
          | Suggested Actions    |
          +----------------------+
                    |
                    v
                 REVIEWER
                    |
          +---------+---------+
          |         |         |
          v         v         v
       APPROVE    REJECT   REQUEST
                            CHANGES
                              |
                              v
                           CREATOR
                              |
                              v
                         EDIT CONTENT
                              |
                              v
                           RESUBMIT
                              |
                              v
                       FRESH REVIEW
```

---

## 🧠 Analyzer Approach

The current VerityAI analyzer is deterministic and rule-based. It does not depend on an LLM to generate compliance decisions.

The backend uses separate analysis components to inspect submitted content, detect potential issues, calculate risk scores and produce structured findings.

For example:

If the approved SmartDesk price is ₹2,999 but an advertisement mentions ₹4,999, the analyzer can flag a potential pricing mismatch.

If submitted content claims that a product is the No. 1 product in India or guarantees a 100% productivity improvement, the analyzer can identify the claim for supporting evidence or human review.

The analyzer provides explainable findings, while authorised Reviewers make the final decision.

**Important:** A detected issue indicates a potential compliance concern. It does not independently establish that a claim is legally false or definitively non-compliant.

---

## 🔐 Demo Login Credentials

The following dedicated accounts are intended for demonstrating the different application roles.

| Role | Email | Password |
|---|---|---|
| Creator 1 | test@teamspace.com | teamspace123 |
| Creator 2 | muskan@gamil.com | muskan123 |
| Reviewer 1 | reviewer2@example.com | review12345 |
| Reviewer 2 | reviewer3@example.com | review12345 |
| Admin | mailflow1407@gmail.com | mailflowdemo |

If you want you can create a new account for creator from log in page and reviewer from admin page. 
These credentials are for demonstration only. Do not use personal passwords or production credentials.

---

## ⚙️ Technology Stack

### Frontend
- React
- TypeScript
- Vite
- TanStack Router
- Tailwind CSS
- shadcn/ui

### Backend
- Python
- FastAPI
- JWT Authentication (HS256)
- Argon2 Password Hashing
- Deterministic compliance analysis modules

### Database
- PostgreSQL
- Neon

### Deployment
- Vercel – Frontend
- Render – Backend

---

## 🏗️ Architecture Overview

VerityAI follows a frontend-backend architecture.

**Frontend**
- Provides role-based dashboards and application pages.
- Handles authentication and user interactions.
- Sends content submissions to the backend.
- Displays compliance reports and review results.

**Backend**
- Provides REST API endpoints through FastAPI.
- Handles authentication and role-based access.
- Runs deterministic content analysis.
- Calculates severity-based risk scores.
- Stores reports and review information.

**Database**
- Neon PostgreSQL stores application data.
- Maintains user and role information.
- Stores submitted reports, issue findings and review-related records.
- Supports brand knowledge and review workflow data.

---

## 🛠️ Local Setup

### Prerequisites

- Node.js and npm
- Python
- PostgreSQL or a configured Neon database
- Git

### Clone the Repository

```bash
git clone https://github.com/nidhijainofficial07-star/VerifyAI.git
cd VerifyAI
```

### Frontend Setup

```bash
npm install
npm run dev
```

### Backend Setup

The backend uses Python and FastAPI.

1. Navigate to the backend directory.
2. Create and activate a Python virtual environment.
3. Install dependencies from the backend requirements file.
4. Configure the required environment variables.
5. Configure the PostgreSQL database connection.
6. Start the FastAPI application using the project's backend configuration.

Refer to the backend project files for the exact dependency and startup commands.

### Environment Configuration

Configure the necessary backend environment variables, including:

- Database connection URL.
- JWT secret.
- Authentication and application configuration.
- Any other required deployment settings.

Never commit `.env` files, database credentials, JWT secrets or other sensitive information to GitHub.

---

## ⚠️ Current Limitations

VerityAI is a working MVP focused on text-based compliance analysis and human review.

The following capabilities are not part of the current implementation:

- LLM-powered semantic analysis.
- Gemini-based content interpretation.
- RAG-based document retrieval.
- Image, screenshot, logo or video compliance analysis.
- Fully automated document parsing and knowledge extraction.
- Automatic generative rewriting of every detected issue.

The Admin interface supports guideline, product fact, terminology and document management. However, not every UI-managed brand entry is necessarily dynamically enforced by every deterministic analyzer rule.

The analyzer uses predefined rules and may not understand every contextual, indirect or ambiguous claim.

Some account-specific report-history filtering requires further verification, particularly for the first Creator account.

A complete side-by-side version comparison of every original and revised submission is also a future improvement.

---

## 🚀 Future Improvements

1. **Advanced Compliance Detection:** Expand contextual detection and improve the handling of ambiguous claims.
2. **Document Intelligence:** Add complete document parsing and structured extraction of approved brand information.
3. **RAG-Based Evidence Retrieval:** Retrieve relevant sections of approved documents to support findings.
4. **Generative Correction Assistance:** Introduce optional AI-assisted rewriting while preserving human approval.
5. **Expanded Content Support:** Add image, logo, screenshot and video compliance checks.
6. **Evidence Traceability:** Improve precise document-level references and source linking.
7. **Review Analytics:** Expand reviewer performance statistics and compliance reporting.
8. **Version Comparison:** Add clearer comparisons between original and resubmitted content.
9. **Access and History Improvements:** Strengthen account-specific report filtering and review visibility.

---

## 👩‍💻 Project Ownership

**Team NAIVA**

**Nidhi Rakesh Jain**

Individual Project Lead & Developer

VerityAI was planned and developed as an individual project for CodeNexus India 2026.

---

**VerityAI — Every Brand Decision, Verified.**
