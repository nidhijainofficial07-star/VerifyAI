// VerityAI — shared domain types.
// The frontend is a functional MVP backed by localStorage; these types are the
// contract the future FastAPI + Supabase backend will implement.

export type Severity = "critical" | "high" | "medium" | "low";

export type IssueCategory =
  | "pricing"
  | "product-name"
  | "restricted-term"
  | "unsupported-claim"
  | "tone";

export type ConfidenceLabel =
  | "Confirmed Mismatch"
  | "Needs Human Review"
  | "Potential Violation";

export type IssueResolution = "pending" | "accepted" | "rejected" | "edited";

export type ReviewStatus =
  | "pending_review"
  | "approved"
  | "rejected"
  | "changes_requested";

export type AnalysisStatus = "compliant" | "issues_found";

export type ContentType =
  | "Advertisement"
  | "Social Media"
  | "Blog"
  | "Email"
  | "Product Description";

export interface BrandGuideline {
  id: string;
  title: string;
  description: string;
  category: string;
  rule: string;
  severity: Severity;
  active: boolean;
  createdAt: string;
}

export interface ProductFact {
  id: string;
  productName: string;
  approvedPrice: string;
  specification: string;
  approvedDescription: string;
  updatedAt: string;
}

export interface TerminologyEntry {
  id: string;
  preferred: string;
  restricted: string;
  alternative: string;
}

export interface GuidelineDocument {
  id: string;
  name: string;
  status: "indexed" | "processing" | "failed";
  sizeLabel: string;
  uploadedAt: string;
}

export interface Issue {
  id: string;
  title: string;
  category: IssueCategory;
  severity: Severity;
  /** Human-readable verdict label — never presents an uncertain AI finding as fact. */
  confidence: ConfidenceLabel;
  originalText: string;
  explanation: string;
  approvedValue: string;
  evidenceSource: string;
  /** Character offset of originalText inside the submitted content, for safe replacement. */
  matchIndex: number;
  /** Ready replacement text, when the engine can propose one deterministically. */
  suggestedCorrection: string | null;
  /** For findings the engine cannot rewrite automatically. */
  suggestedAction: string | null;
  resolution: IssueResolution;
  /** Replacement text when a reviewer edited the engine's suggestion. */
  resolvedText: string | null;
  resolvedAt: string | null;
}

export interface SeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

export interface Analysis {
  analyzedAt: string;
  status: AnalysisStatus;
  issues: Issue[];
  counts: SeverityCounts;
  engine: string;
}

export interface ReviewDecision {
  decision: "approved" | "rejected" | "changes_requested";
  comment: string;
  reviewer: string;
  at: string;
}

export interface Submission {
  id: string;
  title: string;
  contentType: ContentType;
  content: string;
  createdAt: string;
  analysis: Analysis;
  reviewStatus: ReviewStatus;
  /** Content rebuilt with accepted corrections applied (original is never overwritten). */
  correctedContent: string | null;
  review: ReviewDecision | null;
}

export interface AppState {
  org: { name: string; industry: string };
  user: { name: string; email: string; role: string };
  guidelines: BrandGuideline[];
  facts: ProductFact[];
  terminology: TerminologyEntry[];
  documents: GuidelineDocument[];
  submissions: Submission[];
}
