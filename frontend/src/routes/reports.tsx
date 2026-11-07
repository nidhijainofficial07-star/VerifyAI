import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getSubmissionsViaApi } from "@/lib/api";
import { AlertTriangle, CheckCircle2, ClipboardCheck, FileSearch, ScanSearch } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { summarizeCounts } from "@/lib/analysis";
import type { Submission } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComplianceBadge, ReviewBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "VerityAI — Compliance Reports" },
      {
        name: "description",
        content: "Every compliance report generated from submitted content, with evidence and corrections.",
      },
      { property: "og:title", content: "VerityAI — Compliance Reports" },
      {
        property: "og:description",
        content: "Every compliance report generated from submitted content, with evidence and corrections.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportRow({ submission }: { submission: Submission }) {
  const a = submission.analysis;
  return (
    <li className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/reports/$id"
            params={{ id: submission.id }}
            className="truncate text-sm font-semibold hover:text-primary hover:underline md:text-base"
          >
            {submission.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(submission.createdAt)} · {submission.contentType} · {a.engine}
          </p>
        </div>
        <ComplianceBadge status={a.status} />
        <div className="text-right text-xs">
          <p className="font-medium">
            {a.issues.length} issue{a.issues.length === 1 ? "" : "s"}
          </p>
          <p className="text-muted-foreground">{summarizeCounts(a.counts)}</p>
        </div>
        <ReviewBadge status={submission.reviewStatus} />
        <Button asChild variant="outline" size="sm">
          <Link to="/reports/$id" params={{ id: submission.id }}>
            <FileSearch className="h-4 w-4" /> Open report
          </Link>
        </Button>
      </div>
    </li>
  );
}


function ReportsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      setError("");

      try {
        const data = await getSubmissionsViaApi();
        setSubmissions(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load reports."
        );
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, []);

  const isDetailPage = useMatch({
    from: "/reports/$id",
    shouldThrow: false,
  });

  const sorted = [...submissions].sort((a, b) =>
  b.createdAt.localeCompare(a.createdAt)
);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!isDetailPage && loading && (
  <p className="text-sm text-muted-foreground">
    Loading reports...
  </p>
)}

{!isDetailPage && error && (
  <p className="text-sm text-destructive">{error}</p>
)}
      {!isDetailPage && (
        <>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Compliance Reports
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Evidence-based reports generated for every submitted piece of content.
              </p>
            </div>

            <Button asChild>
              <Link to="/analyzer">
                <ScanSearch className="h-4 w-4" /> New analysis
              </Link>
            </Button>
          </div>

          {!loading && !error && sorted.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="No reports yet"
              description="Analyse content in the Content Analyzer to generate your first compliance report."
              action={
                <Button asChild>
                  <Link to="/analyzer">
                    <ScanSearch className="h-4 w-4" /> Analyse content
                  </Link>
                </Button>
              }
            />
          ) : !loading && !error && sorted.length > 0 ? (
  <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {sorted.length} report{sorted.length === 1 ? "" : "s"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {sorted.map((s) => (
                    <ReportRow key={s.id} submission={s} />
                  ))}
                </ul>
              </CardContent>
              </Card>
          ) : null}

          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {submissions.some(
  (s) => s.reviewStatus === "pending_review"
) ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5 text-warning-foreground" />
                Some reports are waiting on a human decision.
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-accent-foreground" />
                No pending reviews — human decisions recorded in the{" "}
                <Link
                  to="/review"
                  className="mx-0.5 inline-flex items-center gap-1 underline"
                >
                  <ClipboardCheck className="h-3 w-3" />
                  Review Center
                </Link>.
              </>
            )}
          </p>
        </>
      )}

      <Outlet />
    </div>
  );
}
