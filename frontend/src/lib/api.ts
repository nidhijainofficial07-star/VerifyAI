import type {
  Analysis,
  ContentType,
  Issue,
  IssueCategory,
  Severity,
  ReviewDecision,
} from "./types";

export interface AnalyzeRequest {
  title: string;
  contentType: ContentType;
  content: string;
}

interface BackendIssue {
  type: string;
  severity: string;
  status: string;
  message: string;
  evidence: string;
  suggestion: string;
}

interface BackendResponse {
  report_id: number | string;
  created_at?: string;
  brand: string;
  total_issues: number;
  issues: BackendIssue[];
  overall_status: string;
}

export interface AnalyzeApiResult {
  reportId: string;
  analysis: Analysis;
}

const API_BASE_URL = (
import.meta.env["VITE_API_BASE_URL"] || "http://127.0.0.1:8000"
).replace(/\/$/, "");

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
    const matchIndex = content.toLowerCase().indexOf(searchText.toLowerCase());

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
    response = await fetch(`${API_BASE_URL}/analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        content: request.content,
      }),
    });
  } catch {
    throw new Error(
      "Cannot connect to the VerityAI backend. Make sure the FastAPI server is running."
    );
  }

  if (!response.ok) {
    let message = `Analysis failed (${response.status}).`;

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const data: BackendResponse = await response.json();

  const issues = data.issues.map((issue, index) =>
    mapIssue(issue, index, request.content)
  );

  const counts = issues.reduce(
    (result, issue) => {
      result[issue.severity]++;
      return result;
    },
    {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    }
  );

  const analysis: Analysis = {
    analyzedAt: data.created_at || new Date().toISOString(),
    status:
      data.overall_status === "no_issues_detected"
        ? "compliant"
        : "issues_found",
    issues,
    counts,
    engine: "FastAPI deterministic rule engine",
  };

  return {
    reportId: String(data.report_id),
    analysis,
  };
}
export async function submitReviewViaApi(
  reportId: string,
  decision: ReviewDecision["decision"],
  comment: string
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/reports/${encodeURIComponent(reportId)}/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          review_status:
            decision === "changes_requested"
              ? "request_changes"
              : decision,
          reviewer_comment: comment,
        }),
      }
    );
  } catch {
    throw new Error(
      "Cannot connect to the backend. Make sure FastAPI is running."
    );
  }

  if (!response.ok) {
    let message = `Review submission failed (${response.status}).`;

    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }
}