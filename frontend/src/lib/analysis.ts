import type {
  Analysis,
  Issue,
  IssueCategory,
  IssueResolution,
  ProductFact,
  Severity,
  SeverityCounts,
  Submission,
  TerminologyEntry,
} from "./types";

/*
 * VerityAI rule-based demo analysis engine.
 *
 * Deterministic by design: same content + same brand knowledge always yields
 * the same report. It is clearly separated so it can later be replaced by the
 * FastAPI + Gemini semantic service without touching any UI component.
 */

export interface BrandKnowledge {
  facts: ProductFact[];
  terminology: TerminologyEntry[];
}

export interface AnalyzeInput {
  title: string;
  contentType: string;
  content: string;
}

const CLAIM_GUIDELINE_SOURCE = "Brand Guidelines — No Exaggerated Promotional Language";
const NO_EVIDENCE_SOURCE = "Brand Knowledge Base — no matching evidence record found";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "SmartDesk Pro" -> /smart[\s-]?desk[\s-]?pro/i */
function productNameRegex(name: string) {
  const tokens = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s-]+/).filter(Boolean);
  return new RegExp(tokens.map(escapeRegExp).join("[\\s-]?"), "gi");
}

function parsePrice(text: string): number | null {
  const digits = text.replace(/[₹,\s]/g, "");
  const n = Number.parseFloat(digits);
  return Number.isFinite(n) ? n : null;
}

function splitSentences(content: string): Array<{ text: string; offset: number }> {
  const out: Array<{ text: string; offset: number }> = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[0].trim().length > 0) out.push({ text: m[0], offset: m.index });
  }
  return out;
}

function makeIssue(
  category: IssueCategory,
  severity: Severity,
  confidence: Issue["confidence"],
  fields: {
    title: string;
    originalText: string;
    matchIndex: number;
    explanation: string;
    approvedValue: string;
    evidenceSource: string;
    suggestedCorrection: string | null;
    suggestedAction: string | null;
  },
): Issue {
  return {
    id: "",
    category,
    severity,
    confidence,
    resolution: "pending" as IssueResolution,
    resolvedText: null,
    resolvedAt: null,
    ...fields,
  };
}

function overlaps(a: { matchIndex: number; length: number }, issues: Issue[]) {
  return issues.some(
    (i) =>
      a.matchIndex < i.matchIndex + i.originalText.length &&
      i.matchIndex < a.matchIndex + a.length,
  );
}

export function analyzeContent(content: string, knowledge: BrandKnowledge): Analysis {
  const issues: Issue[] = [];
  const sentences = splitSentences(content);

  // --- 1. Price verification against Approved Product Facts -----------------
  for (const sentence of sentences) {
    const mentioned = knowledge.facts.filter((f) =>
      new RegExp(productNameRegex(f.productName).source, "i").test(sentence.text),
    );
    if (mentioned.length === 0) continue;
    const priceRe = /₹\s?[\d,]+(?:\.\d+)?/g;
    let pm: RegExpExecArray | null;
    while ((pm = priceRe.exec(sentence.text)) !== null) {
      const stated = parsePrice(pm[0]);
      const matchingFact = mentioned.find((f) => parsePrice(f.approvedPrice) === stated);
      if (matchingFact) continue;
      const fact = mentioned[0];
      const absolute = sentence.offset + pm.index;
      issues.push(
        makeIssue("pricing", "high", "Confirmed Mismatch", {
          title: "Incorrect Product Price",
          originalText: pm[0],
          matchIndex: absolute,
          explanation:
            "The submitted price does not match the approved product record for this product.",
          approvedValue: `${fact.productName} costs ${fact.approvedPrice} (Approved Product Facts).`,
          evidenceSource: "Approved Product Facts table",
          suggestedCorrection: fact.approvedPrice,
          suggestedAction: null,
        }),
      );
    }
  }

  // --- 2. Product name consistency ------------------------------------------
  for (const fact of knowledge.facts) {
    const re = productNameRegex(fact.productName);
    let nm: RegExpExecArray | null;
    while ((nm = re.exec(content)) !== null) {
      if (nm[0] === fact.productName) continue;
      issues.push(
        makeIssue("product-name", "medium", "Confirmed Mismatch", {
          title: "Inconsistent Product Name",
          originalText: nm[0],
          matchIndex: nm.index,
          explanation:
            "The official product name must be used consistently. This variant does not match the registered product name.",
          approvedValue: fact.productName,
          evidenceSource: "Approved Product Facts table",
          suggestedCorrection: fact.productName,
          suggestedAction: null,
        }),
      );
    }
  }

  // --- 3. Restricted terminology ---------------------------------------------
  for (const entry of knowledge.terminology) {
    const re = new RegExp(`\\b${escapeRegExp(entry.restricted)}\\b`, "gi");
    let tm: RegExpExecArray | null;
    while ((tm = re.exec(content)) !== null) {
      issues.push(
        makeIssue("restricted-term", "medium", "Potential Violation", {
          title: "Restricted Terminology",
          originalText: tm[0],
          matchIndex: tm.index,
          explanation: `"${entry.restricted}" is on the restricted terms list for this brand.`,
          approvedValue: `Preferred wording: "${entry.preferred}" (alternative: "${entry.alternative}").`,
          evidenceSource: "Approved Terminology list",
          suggestedCorrection: entry.alternative,
          suggestedAction: null,
        }),
      );
    }
  }

  // --- 4. Unsupported promotional claims -------------------------------------
  const claimRules: Array<{ re: RegExp; title: string; severity: Severity; explanation: string }> = [
    {
      re: /\b(?:no\.?\s*1|number\s*one|#1)\b/gi,
      title: "Unsupported Ranking Claim",
      severity: "high",
      explanation:
        "The content claims a market ranking, but no approved evidence supporting this ranking is available in the brand knowledge base.",
    },
    {
      re: /\bguarantees?\b[^.!?\n]*\b\d+\s?%/gi,
      title: "Unverified Performance Guarantee",
      severity: "high",
      explanation:
        "The content guarantees a measurable outcome, but no approved evidence on record supports this guarantee.",
    },
    {
      re: /\b100\s?%/g,
      title: "Unverified Absolute Claim",
      severity: "high",
      explanation:
        "Absolute performance figures need approved evidence before they can be published.",
    },
    {
      re: /\bbest\b/gi,
      title: "Unapproved Superlative",
      severity: "medium",
      explanation:
        "Superlative claims such as \"best\" require approved supporting evidence in the brand knowledge base.",
    },
  ];
  for (const rule of claimRules) {
    let cm: RegExpExecArray | null;
    while ((cm = rule.re.exec(content)) !== null) {
      if (overlaps({ matchIndex: cm.index, length: cm[0].length }, issues)) continue;
      issues.push(
        makeIssue("unsupported-claim", rule.severity, "Needs Human Review", {
          title: rule.title,
          originalText: cm[0],
          matchIndex: cm.index,
          explanation: rule.explanation,
          approvedValue: "No approved evidence on record for this claim.",
          evidenceSource: NO_EVIDENCE_SOURCE,
          suggestedCorrection: null,
          suggestedAction:
            "Remove this claim, or attach authorised supporting evidence to the brand knowledge base before publishing.",
        }),
      );
    }
  }

  // --- 5. Tone & messaging (demo rules) --------------------------------------
  const exclaims = (content.match(/!/g) ?? []).length;
  if (exclaims > 1) {
    issues.push(
      makeIssue("tone", "low", "Potential Violation", {
        title: "Excessive Promotional Punctuation",
        originalText: `${exclaims} exclamation marks`,
        matchIndex: content.indexOf("!"),
        explanation:
          "Demo tone rule: more than one exclamation mark reads as aggressive sales language and conflicts with the professional-and-friendly tone guideline.",
        approvedValue: "Professional and friendly tone — at most one exclamation mark per piece.",
        evidenceSource: "Brand Guidelines — Professional & Friendly Tone",
        suggestedCorrection: null,
        suggestedAction: "Rewrite with at most one exclamation mark, keeping a calm, confident tone.",
      }),
    );
  }
  const capsRe = /\b[A-Z]{3,}\b/g;
  let caps: RegExpExecArray | null;
  while ((caps = capsRe.exec(content)) !== null) {
    issues.push(
      makeIssue("tone", "low", "Potential Violation", {
        title: "Shouting Capitalisation",
        originalText: caps[0],
        matchIndex: caps.index,
        explanation:
          "Demo tone rule: all-capital words read as shouting in customer-facing copy.",
        approvedValue: "Sentence case is preferred across brand channels.",
        evidenceSource: "Brand Guidelines — Professional & Friendly Tone",
        suggestedCorrection: null,
        suggestedAction: `Write "${caps[0][0] + caps[0].slice(1).toLowerCase()}" in sentence case.`,
      }),
    );
  }

  // Order issues by position in the content for readable reports.
  issues.sort((a, b) => a.matchIndex - b.matchIndex);
  issues.forEach((issue, i) => {
    issue.id = `iss_${i + 1}`;
  });

  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const issue of issues) counts[issue.severity] += 1;

  return {
    analyzedAt: new Date().toISOString(),
    status: issues.length === 0 ? "compliant" : "issues_found",
    issues,
    counts,
    engine: "VerityAI Demo Engine v1 (rule-based)",
  };
}

/** Rebuild the content with accepted (or reviewer-edited) corrections applied. */
export function buildCorrectedContent(submission: Submission): string | null {
  const applicable = submission.analysis.issues.filter(
    (i) =>
      (i.resolution === "accepted" && i.suggestedCorrection) ||
      (i.resolution === "edited" && i.resolvedText),
  );
  if (applicable.length === 0) return null;
  let content = submission.content;
  const sorted = [...applicable].sort((a, b) => b.matchIndex - a.matchIndex);
  for (const issue of sorted) {
    const start = issue.matchIndex;
    const end = start + issue.originalText.length;
    if (content.slice(start, end) !== issue.originalText) continue; // span shifted; skip safely
    const replacement = issue.resolution === "edited" ? issue.resolvedText! : issue.suggestedCorrection!;
    content = content.slice(0, start) + replacement + content.slice(end);
  }
  return content;
}

export function summarizeCounts(counts: SeverityCounts): string {
  const parts: string[] = [];
  if (counts.critical) parts.push(`${counts.critical} critical`);
  if (counts.high) parts.push(`${counts.high} high`);
  if (counts.medium) parts.push(`${counts.medium} medium`);
  if (counts.low) parts.push(`${counts.low} low`);
  return parts.length ? parts.join(" · ") : "No issues";
}
