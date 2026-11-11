import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  getSubmissionViaApi,
  getReviewHistoryViaApi,
  getIssueReviewsViaApi,
} from "@/lib/api";
import type {
  Submission,
  BackendReviewHistory,
  BackendIssueReview,
} from "@/lib/types";
import {
  ArrowLeft,
  ClipboardCheck,
  Copy,
  FileWarning,
  ShieldCheck,
} from "lucide-react";
// No local-store import needed here.
import { summarizeCounts } from "@/lib/analysis";
import { formatDateTime, riskLevel } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { IssueCard } from "@/components/issue-card";
import {
  ComplianceBadge,
  ReviewBadge,
  SeverityBadge,
} from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/reports/$id")({
  head: () => ({
    meta: [
      { title: "VerityAI — Compliance Report" },
      {
        name: "description",
        content: "Evidence-based compliance report with detected issues and suggested corrections.",
      },
      { property: "og:title", content: "VerityAI — Compliance Report" },
      {
        property: "og:description",
        content: "Evidence-based compliance report with detected issues and suggested corrections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportDetailPage,
});

function ReportDetailPage() {
  const { id } = useParams({ from: Route.id });
const [reviewHistory, setReviewHistory] = useState<BackendReviewHistory[]>([]);
const [issueReviews, setIssueReviews] = useState<BackendIssueReview[]>([]);
const [historyLoaded, setHistoryLoaded] = useState(false);
const [submission, setSubmission] = useState<Submission | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [copied, setCopied] = useState(false);

useEffect(() => {
  async function loadSubmission() {
    setLoading(true);
    setError("");

    try {
      const data = await getSubmissionViaApi(id);
      setSubmission(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not load this report."
      );
    } finally {
      setLoading(false);
    }
  }

  void loadSubmission();
}, [id]);

useEffect(() => {
  let active = true;

  async function loadReviewHistory() {
    try {
      const [historyResult, issueResult] = await Promise.allSettled([
        getReviewHistoryViaApi(id),
        getIssueReviewsViaApi(id),
      ]);

      if (!active) return;

      if (
        historyResult.status === "fulfilled" &&
        issueResult.status === "fulfilled"
      ) {
        setReviewHistory(historyResult.value);
        setIssueReviews(issueResult.value);
        setHistoryLoaded(true);
      }
    } catch {
      // History is optional for users without reviewer/admin access.
    }
  }

  void loadReviewHistory();

  return () => {
    active = false;
  };
}, [id]);

if (loading) {
  return (
    <div className="mx-auto max-w-3xl py-10 text-center">
      <p className="text-sm text-muted-foreground">
        Loading compliance report...
      </p>
    </div>
  );
}

if (error) {
  return (
    <div className="mx-auto max-w-3xl">
      <EmptyState
        icon={FileWarning}
        title="Could not load report"
        description={error}
        action={
          <Button asChild>
            <Link to="/reports">Back to Compliance Reports</Link>
          </Button>
        }
      />
    </div>
  );
}

  if (!submission) {
    return (
      <div className="mx-auto max-w-3xl">
        <EmptyState
          icon={FileWarning}
          title="Report not found"
          description="This report may have been removed or the link is outdated."
          action={
            <Button asChild>
              <Link to="/reports">Back to Compliance Reports</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const a = submission.analysis;
  const pendingIssues = a.issues.filter((i) => i.resolution === "pending").length;

  const copyCorrected = async () => {
    if (!submission.correctedContent) return;
    try {
      await navigator.clipboard.writeText(submission.correctedContent);
      setCopied(true);
      toast.success("Corrected content copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/reports">
            <ArrowLeft className="h-4 w-4" /> All reports
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to="/review/$id" params={{ id: submission.id }}>
            <ClipboardCheck className="h-4 w-4" /> Open in Review Center
          </Link>
        </Button>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{submission.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {submission.contentType} · Analysed {formatDateTime(a.analyzedAt)} · {a.engine}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ComplianceBadge status={a.status} />
          <ReviewBadge status={submission.reviewStatus} />
          <Badge variant="outline">Risk level: {riskLevel(a.counts)}</Badge>
        </div>
      </div>

      {/* Overall compliance summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Overall Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border p-3 text-center">
              <p className="text-2xl font-semibold">{a.issues.length}</p>
              <p className="text-xs text-muted-foreground">Total issues</p>
            </div>
            {(["critical", "high", "medium", "low"] as const).map((sev) => (
              <div key={sev} className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-semibold">{a.counts[sev]}</p>
                <div className="mt-1 flex justify-center">
                  <SeverityBadge severity={sev} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">{summarizeCounts(a.counts)}</p>
          {a.status === "compliant" && (
            <p className="mt-3 flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-accent-foreground">
              <ShieldCheck className="h-4 w-4" /> No issues detected against the current brand
              knowledge. Human review is still available before publication.
            </p>
          )}
          {pendingIssues > 0 && a.status !== "compliant" && (
            <p className="mt-3 text-sm text-muted-foreground">
              {pendingIssues} issue{pendingIssues === 1 ? "" : "s"} still awaiting a correction decision.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Suggested corrections compare */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Suggested Corrections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Original content (never overwritten)
            </p>
            <p className="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm whitespace-pre-wrap">
              {submission.content}
            </p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Suggested corrected content
              </p>
              {submission.correctedContent && (
                <Button variant="ghost" size="sm" onClick={copyCorrected}>
                  <Copy className="h-3.5 w-3.5" /> {copied ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>
            {submission.correctedContent ? (
              <p className="rounded-lg border border-success/40 bg-success/10 px-3 py-2.5 text-sm whitespace-pre-wrap">
                {submission.correctedContent}
              </p>
            ) : (
              <p className="rounded-lg border border-dashed px-3 py-2.5 text-sm text-muted-foreground">
                Accept one or more suggested corrections below and the corrected version will appear here.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detected issues */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Detected Issues ({a.issues.length})</h3>
        {a.issues.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No issues detected"
            description="Every price, name, term and claim in this content matched the approved brand knowledge."
          />
        ) : (
          a.issues.map((issue) => (
  <IssueCard
    key={issue.id}
    issue={issue}
    interactive={false}
  />
))
        )}
      </div>
    </div>
  );
}
