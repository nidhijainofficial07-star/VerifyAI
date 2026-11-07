
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
  import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000"
).replace(/\/$/, "");

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

// ANALYSIS MAPPING

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
  let searchText = "";

  if (issue.type === "price_mismatch") {
    const priceMatch = issue.message.match(/₹\s*[\d,]+/);
    searchText = priceMatch?.[0] ?? "";
  }

  if (issue.type === "unsupported_claim") {
    const claimMatch = issue.message.match(/claim\s+'([^']+)'/i);
    searchText = claimMatch?.[1] ?? "";
  }

  if (searchText) {
    const matchIndex = content
      .toLowerCase()
      .indexOf(searchText.toLowerCase());

    if (matchIndex !== -1) {
      return {
        originalText: content.slice(
          matchIndex,
          matchIndex + searchText.length
        ),
        matchIndex,
      };
    }
  }

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
    evidenceSource: "SmartDesk brand profile",
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
