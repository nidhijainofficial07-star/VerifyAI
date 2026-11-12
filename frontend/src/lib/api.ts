import type {
  Analysis,
  ContentType,
  Issue,
  IssueCategory,
  Severity,
  ReviewDecision,
  BackendIssue,
  BackendReport,
  BackendReportsResponse,
  Submission,
  BackendIssueReview,
  BackendIssueReviewsResponse,
  BackendReviewHistory,
  BackendReviewHistoryResponse,
  BrandGuideline,
  ProductFact,
  TerminologyEntry,
} from "./types";

export interface AnalyzeRequest {
  title: string;
  contentType: ContentType;
  content: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "creator" | "reviewer" | "admin";
}

export interface AdminStats {
  users: {
    total: number;
    creators: number;
    reviewers: number;
    admins: number;
  };
  reports: {
    total: number;
    pending: number;
    completed: number;
  };
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface AnalyzeApiResult {
  reportId: string;
  analysis: Analysis;
}

const API_BASE_URL = (
  import.meta.env["VITE_API_BASE_URL"] ||
  "https://verityai-backend-bsbo.onrender.com"
).replace(/\/+$/, "");

export function saveAuthToken(token: string): void {
  sessionStorage.setItem("verityai_token", token);
}

export function getAuthToken(): string | null {
  return sessionStorage.getItem("verityai_token");
}

export function clearAuthToken(): void {
  sessionStorage.removeItem("verityai_token");
}

async function authenticatedFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();

  if (!token) {
    throw new Error("Please log in to continue.");
  }

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);

  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
}

async function getErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const errorData = await response.json();
    return errorData.detail || fallback;
  } catch {
    return fallback;
  }
}

// AUTHENTICATION

export async function loginViaApi(
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Login failed.")
    );
  }

  const data: AuthResponse = await response.json();
  saveAuthToken(data.access_token);

  return data;
}

export async function registerCreatorViaApi(
  name: string,
  email: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Registration failed.")
    );
  }

  const data: AuthResponse = await response.json();
  saveAuthToken(data.access_token);

  return data;
}



export async function submitReviewerRequestViaApi(
  name: string,
  email: string,
  password: string
) {
  const response = await fetch(`${API_BASE_URL}/auth/reviewer-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Reviewer request failed.")
    );
  }

  return response.json();
}

export async function getReviewerRequestsViaApi() {
  const response = await authenticatedFetch("/admin/reviewer-requests");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load reviewer requests.")
    );
  }

  return response.json();
}

export async function decideReviewerRequestViaApi(
  requestId: number,
  decision: "approve" | "reject"
) {
  const response = await authenticatedFetch(
    `/admin/reviewer-requests/${requestId}/decision`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not process reviewer request.")
    );
  }

  return response.json();
}

export async function getCurrentUserViaApi(): Promise<AuthUser> {
  const response = await authenticatedFetch("/auth/me");

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
    }

    throw new Error(
      await getErrorMessage(response, "Could not verify your session.")
    );
  }

  return response.json();
}

export async function createReviewerViaApi(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const response = await authenticatedFetch("/admin/reviewers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not create reviewer.")
    );
  }

  const data = await response.json();
  return data.reviewer;
}

export async function getAdminStatsViaApi(): Promise<AdminStats> {

  
  const response = await authenticatedFetch("/admin/stats");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load admin statistics.")
    );
  }

  return response.json();
}

// ANALYSIS MAPPING
export interface Reviewer {
  id: number;
  name: string;
  email: string;
  role: "reviewer";
}

export async function getReviewersViaApi(): Promise<Reviewer[]> {
  const response = await authenticatedFetch("/admin/reviewers");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load reviewers.")
    );
  }

  const data: { total_reviewers: number; reviewers: Reviewer[] } =
    await response.json();

  return data.reviewers;
}

export async function deleteReviewerViaApi(
  reviewerId: number
): Promise<void> {
  const response = await authenticatedFetch(
    `/admin/reviewers/${reviewerId}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not remove reviewer.")
    );
  }
}

function mapCategory(type: string): IssueCategory {
  switch (type) {
    case "price_mismatch":
      return "pricing";
    case "product_name":
      return "product-name";
    case "unsupported_claim":
      return "unsupported-claim";
    default:
      return "restricted-term";
  }
}

function mapSeverity(value: string): Severity {
  if (["critical", "high", "medium", "low"].includes(value)) {
    return value as Severity;
  }

  return "medium";
}

function mapConfidence(status: string) {
  switch (status) {
    case "confirmed_mismatch":
      return "Confirmed Mismatch" as const;
    case "needs_human_review":
    case "needs_review":
      return "Needs Human Review" as const;
    default:
      return "Potential Violation" as const;
  }
}



function findIssueMatch(
  issue: BackendIssue,
  content: string
): { originalText: string; matchIndex: number } {
  const findInContent = (
    searchText: string
  ): { originalText: string; matchIndex: number } | null => {
    if (!searchText) return null;

    const matchIndex = content
      .toLowerCase()
      .indexOf(searchText.toLowerCase());

    if (matchIndex === -1) return null;

    return {
      originalText: content.slice(
        matchIndex,
        matchIndex + searchText.length
      ),
      matchIndex,
    };
  };

  // 1. Price mismatch
  if (issue.type === "price_mismatch") {
    const priceMatch = issue.message.match(/₹\s*[\d,]+(?:\.\d+)?/);
    const result = findInContent(priceMatch?.[0] ?? "");

    if (result) return result;
  }

  // 2. Unsupported claims explicitly mentioned in the message
  if (issue.type === "unsupported_claim") {
    const claimMatch = issue.message.match(/claim\s+'([^']+)'/i);

    if (claimMatch?.[1]) {
      const result = findInContent(claimMatch[1]);

      if (result) return result;
    }

    // 3. Find claims directly in the original content
    // when the backend message contains only a guideline explanation.
    const claimPatterns = [
      /\bguarante\w*.{0,50}\bperformance\b/i,
      /\bperformance\b.{0,50}\bguarante\w*/i,
      /\b(?:exceptional|outstanding|superior|unmatched|unparalleled)\s+performance\b/i,
      /\b\d+(?:\.\d+)?\s*%\s*(?:productivity|improvement|increase|boost)/i,
      /\b(?:improve|boost|increase|enhance|deliver|offer|provide)\b.{0,40}\bproductivity\b/i,
      /\bno\.?\s*1\b.{0,60}\b(?:desk|product|brand|india)\b/i,
    ];

    for (const pattern of claimPatterns) {
      const match = content.match(pattern);

      if (match?.[0]) {
        const result = findInContent(match[0]);

        if (result) return result;
      }
    }

    // 4. Last attempt: use the guideline's quoted claim
    const guidelineClaim =
      issue.evidence_reference?.guideline_rule?.match(/'([^']+)'/)?.[1];

    if (guidelineClaim) {
      const result = findInContent(guidelineClaim);

      if (result) return result;
    }
  }

  // No exact match found
  return {
    originalText: issue.message,
    matchIndex: -1,
  };
}

function mapIssue(
  backendIssue: BackendIssue,
  index: number,
  content: string
): Issue {
    const match = findIssueMatch(backendIssue, content);

  console.log("VerityAI issue mapping:", {
    content,
    backendMessage: backendIssue.message,
    matchedText: match.originalText,
    matchIndex: match.matchIndex,
  });

  return {
    id: `issue_${index + 1}`,
    title: backendIssue.type
      .replaceAll("_", " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
    category: mapCategory(backendIssue.type),
    severity: mapSeverity(backendIssue.severity),
    confidence: mapConfidence(backendIssue.status),
    originalText: match.originalText,
    explanation: backendIssue.message,
    approvedValue: backendIssue.evidence,
evidenceSource:
  backendIssue.evidence_reference?.source_title ??
  "SmartDesk brand profile",
...(backendIssue.evidence_reference && {
  evidenceReference: backendIssue.evidence_reference,
}),
matchIndex: match.matchIndex,
    suggestedCorrection: null,
    suggestedAction: backendIssue.suggestion,
    resolution: "pending",
    resolvedText: null,
    resolvedAt: null,
  };
}

function mapBackendAnalysis(
  data: {
    created_at?: string;
    result: {
      issues: BackendIssue[];
      overall_status: string;
    };
  },
  content: string
): Analysis {
  const issues = data.result.issues.map((issue, index) =>
    mapIssue(issue, index, content)
  );

  const counts = issues.reduce(
    (result, issue) => {
      result[issue.severity]++;
      return result;
    },
    { critical: 0, high: 0, medium: 0, low: 0 }
  );

  return {
    analyzedAt: data.created_at || new Date().toISOString(),
    status:
      data.result.overall_status === "no_issues_detected"
        ? "compliant"
        : "issues_found",
    issues,
    counts,
    engine: "FastAPI deterministic rule engine",
  };
}

function mapBackendReportToSubmission(
  report: BackendReport
): Submission {
  const analysis = mapBackendAnalysis(
    {
      created_at: report.created_at,
      result: report.result,
    },
    report.content
  );

  const reviewStatus = {
    pending: "pending_review",
    approved: "approved",
    rejected: "rejected",
    request_changes: "changes_requested",
  } as const;

  return {
    id: String(report.report_id),
    title: `${report.brand} — ${report.content.slice(0, 45)}${report.content.length > 45 ? "..." : ""}`,
    contentType: "Advertisement",
    content: report.content,
    createdAt: report.created_at,
    analysis,
    reviewStatus: reviewStatus[report.review_status],
    correctedContent: null,
    review: report.review_status === "pending"
      ? null
      : {
          decision:
            report.review_status === "request_changes"
              ? "changes_requested"
              : report.review_status,
          comment: report.reviewer_comment || "",
          reviewer: "Reviewer",
          at: report.created_at,
        },
  };
}

export async function getSubmissionViaApi(
  reportId: string
): Promise<Submission> {
  const reports = await getReportsViaApi();

  const report = reports.find(
    (item) => String(item.report_id) === reportId
  );

  if (!report) {
    throw new Error("Report not found.");
  }

  return mapBackendReportToSubmission(report);
}
export async function getSubmissionsViaApi(): Promise<Submission[]> {
  const reports = await getReportsViaApi();

  return reports.map(mapBackendReportToSubmission);
}
// CONTENT ANALYSIS

export async function analyzeContentViaApi(
  request: AnalyzeRequest
): Promise<AnalyzeApiResult> {
  if (request.content.trim().length < 20) {
    throw new Error(
      "Content is too short to analyse. Paste at least a full sentence."
    );
  }

  let response: Response;

  try {
    response = await authenticatedFetch("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: request.content }),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Please log in to continue.") {
      throw error;
    }

    throw new Error(
      "Cannot connect to the VerityAI backend. Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, `Analysis failed (${response.status}).`)
    );
  }

  const data = await response.json();

  return {
    reportId: String(data.report_id),
    analysis: mapBackendAnalysis(
      {
        created_at: data.created_at,
        result: {
          issues: data.issues,
          overall_status: data.overall_status,
        },
      },
      request.content
    ),
  };
}

// REPORT FETCHING

export async function getReportsViaApi(): Promise<BackendReport[]> {
  const response = await authenticatedFetch("/reports");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load reports.")
    );
  }

  const data: BackendReportsResponse = await response.json();
  return data.reports;
}


export async function deleteReportViaApi(
  reportId: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/reports/${encodeURIComponent(reportId)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        "Could not delete report."
      )
    );
  }
}

// REVIEW SUBMISSION

export async function submitReviewViaApi(
  reportId: string,
  decision: ReviewDecision["decision"],
  comment: string
): Promise<void> {
  let response: Response;

  try {
    response = await authenticatedFetch(
      `/reports/${encodeURIComponent(reportId)}/review`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review_status:
            decision === "changes_requested"
              ? "request_changes"
              : decision,
          reviewer_comment: comment,
        }),
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Please log in to continue.") {
      throw error;
    }

    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Review submission failed (${response.status}).`
      )
    );
  }
}

// ISSUE-LEVEL REVIEW

export async function submitIssueReviewViaApi(
  reportId: string,
  issueIndex: number,
  decision: "accepted" | "rejected" | "request_changes",
  comment: string,
  correction: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/reports/${encodeURIComponent(reportId)}/issues/${issueIndex}/review`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        decision,
        comment,
        correction,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Issue review failed (${response.status}).`
      )
    );
  }
}

// REOPEN REPORT

export async function reopenReportViaApi(
  reportId: string,
  reason: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/reports/${encodeURIComponent(reportId)}/reopen`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Could not reopen report (${response.status}).`
      )
    );
  }
}

// REVIEW HISTORY

export async function getReviewHistoryViaApi(
  reportId: string
): Promise<BackendReviewHistory[]> {
  const response = await authenticatedFetch(
    `/reports/${encodeURIComponent(reportId)}/history`
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Could not load review history (${response.status}).`
      )
    );
  }

  const data: BackendReviewHistoryResponse = await response.json();
  return data.history;
}
// REVIEWER MONTHLY ACTIVITY

export interface ReviewerMonthlyActivity {
  month: string;
  total_reviews: number;
}

interface ReviewerActivityResponse {
  activity: ReviewerMonthlyActivity[];
}

export async function getReviewerActivityViaApi(): Promise<
  ReviewerMonthlyActivity[]
> {
  const response = await authenticatedFetch("/reviewer/activity");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Could not load reviewer activity (${response.status}).`
      )
    );
  }

  const data: ReviewerActivityResponse = await response.json();

  return data.activity;
}
// ISSUE REVIEW HISTORY

export async function getIssueReviewsViaApi(
  reportId: string
): Promise<BackendIssueReview[]> {
  const response = await authenticatedFetch(
    `/reports/${encodeURIComponent(reportId)}/issues/reviews`
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(
        response,
        `Could not load issue reviews (${response.status}).`
      )
    );
  }

  const data: BackendIssueReviewsResponse = await response.json();
  return data.reviews;
}

// ==========================================
// BRAND KNOWLEDGE API
// ==========================================

interface BackendGuideline {
  id: string;
  title: string;
  description: string;
  category: string;
  rule: string;
  severity: Severity;
  active: boolean;
  created_at: string | null;
  version: number;
}

interface BackendFact {
  id: string;
  product_name: string;
  approved_price: number;
  currency: string;
  specifications: string[];
  approved_description: string;
  updated_at: string | null;
  version: number;
}

interface BackendTerminology {
  id: string;
  preferred: string;
  restricted: string;
  alternative: string;
  version: number;
}

function mapGuideline(data: BackendGuideline): BrandGuideline {
  return {
    id: String(data.id),
    title: data.title,
    description: data.description ?? "",
    category: data.category ?? "General",
    rule: data.rule,
    severity: data.severity,
    active: data.active,
    createdAt: data.created_at ?? new Date().toISOString(),
  };
}

function mapFact(data: BackendFact): ProductFact {
  const currencySymbols: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };

  const symbol = currencySymbols[data.currency] ?? `${data.currency} `;

  return {
    id: String(data.id),
    productName: data.product_name,
    approvedPrice: `${symbol}${Number(data.approved_price).toLocaleString("en-IN")}`,
    specification: (data.specifications ?? []).join("; "),
    approvedDescription: data.approved_description ?? "",
    updatedAt: data.updated_at ?? new Date().toISOString(),
  };
}

function mapTerminology(
  data: BackendTerminology
): TerminologyEntry {
  return {
    id: String(data.id),
    preferred: data.preferred,
    restricted: data.restricted,
    alternative: data.alternative ?? "",
  };
}

function getPricePayload(price: string): {
  approved_price: number;
  currency: string;
} {
  const trimmed = price.trim();

  let currency = "INR";

  if (trimmed.includes("$")) currency = "USD";
  else if (trimmed.includes("€")) currency = "EUR";
  else if (trimmed.includes("£")) currency = "GBP";

  const numericPrice = Number(trimmed.replace(/[^\d.]/g, ""));

  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error("Enter a valid approved price.");
  }

  return {
    approved_price: numericPrice,
    currency,
  };
}

// -----------------------------
// GET BRAND KNOWLEDGE
// -----------------------------

export async function getBrandGuidelinesViaApi(): Promise<BrandGuideline[]> {
  const response = await authenticatedFetch("/brand/guidelines");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load brand guidelines.")
    );
  }

  const data: { guidelines: BackendGuideline[] } =
    await response.json();

  return data.guidelines.map(mapGuideline);
}

export async function getBrandFactsViaApi(): Promise<ProductFact[]> {
  const response = await authenticatedFetch("/brand/facts");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load product facts.")
    );
  }

  const data: { facts: BackendFact[] } = await response.json();

  return data.facts.map(mapFact);
}

export async function getBrandTerminologyViaApi(): Promise<TerminologyEntry[]> {
  const response = await authenticatedFetch("/brand/terminology");

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not load terminology.")
    );
  }

  const data: { terminology: BackendTerminology[] } =
    await response.json();

  return data.terminology.map(mapTerminology);
}

// -----------------------------
// GUIDELINE CREATE / UPDATE
// -----------------------------

export async function saveBrandGuidelineViaApi(
  guideline: Omit<BrandGuideline, "id" | "createdAt">,
  id?: string
): Promise<BrandGuideline> {
  const response = await authenticatedFetch(
    id
      ? `/brand/guidelines/${encodeURIComponent(id)}`
      : "/brand/guidelines",
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: guideline.title,
        description: guideline.description,
        category: guideline.category,
        rule: guideline.rule,
        severity: guideline.severity,
        active: guideline.active,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not save guideline.")
    );
  }

  const data: { guideline: BackendGuideline } =
    await response.json();

  return mapGuideline(data.guideline);
}

export async function setBrandGuidelineActiveViaApi(
  id: string,
  active: boolean
): Promise<BrandGuideline> {
  const response = await authenticatedFetch(
    `/brand/guidelines/${encodeURIComponent(id)}/active`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not update guideline status.")
    );
  }

  const data: { guideline: BackendGuideline } =
    await response.json();

  return mapGuideline(data.guideline);
}

export async function deleteBrandGuidelineViaApi(
  id: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/brand/guidelines/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not delete guideline.")
    );
  }
}

// -----------------------------
// PRODUCT FACT CREATE / UPDATE
// -----------------------------

export async function saveBrandFactViaApi(
  fact: Omit<ProductFact, "id" | "updatedAt">,
  id?: string
): Promise<ProductFact> {
  const price = getPricePayload(fact.approvedPrice);

  const response = await authenticatedFetch(
    id
      ? `/brand/facts/${encodeURIComponent(id)}`
      : "/brand/facts",
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_name: fact.productName,
        ...price,
        specification: fact.specification,
        approved_description: fact.approvedDescription,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not save product facts.")
    );
  }

  const data: { fact: BackendFact } = await response.json();

  return mapFact(data.fact);
}

export async function deleteBrandFactViaApi(
  id: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/brand/facts/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not delete product fact.")
    );
  }
}

// -----------------------------
// TERMINOLOGY CREATE / UPDATE
// -----------------------------

export async function saveBrandTerminologyViaApi(
  term: Omit<TerminologyEntry, "id">,
  id?: string
): Promise<TerminologyEntry> {
  const response = await authenticatedFetch(
    id
      ? `/brand/terminology/${encodeURIComponent(id)}`
      : "/brand/terminology",
    {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferred: term.preferred,
        restricted: term.restricted,
        alternative: term.alternative,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not save terminology.")
    );
  }

  const data: { terminology: BackendTerminology } =
    await response.json();

  return mapTerminology(data.terminology);
}

export async function deleteBrandTerminologyViaApi(
  id: string
): Promise<void> {
  const response = await authenticatedFetch(
    `/brand/terminology/${encodeURIComponent(id)}`,
    { method: "DELETE" }
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Could not delete terminology.")
    );
  }
}
