import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { AlertTriangle, ClipboardCheck, ScanSearch } from "lucide-react";
import { useAppState } from "@/lib/store";
import { formatDateTime, riskLevel } from "@/lib/format";
import { summarizeCounts } from "@/lib/analysis";
import type { Submission } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReviewBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "VerityAI — Review Center" },
      {
        name: "description",
        content: "Human review queue: decide on flagged content, corrections and claims.",
      },
      { property: "og:title", content: "VerityAI — Review Center" },
      {
        property: "og:description",
        content: "Human review queue: decide on flagged content, corrections and claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewCenterPage,
});

function ReviewRow({ submission }: { submission: Submission }) {
  const pendingIssues = submission.analysis.issues.filter((i) => i.resolution === "pending").length;
  return (
    <li className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <Link
            to="/review/$id"
            params={{ id: submission.id }}
            className="truncate text-sm font-semibold hover:text-primary hover:underline md:text-base"
          >
            {submission.title}
          </Link>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Submitted {formatDateTime(submission.createdAt)} · {submission.contentType}
          </p>
        </div>
        <div className="text-right text-xs">
          <p className="font-medium">
            {submission.analysis.issues.length} issue{submission.analysis.issues.length === 1 ? "" : "s"}
          </p>
          {pendingIssues > 0 && (
            <p className="text-muted-foreground">{pendingIssues} awaiting decision</p>
          )}
        </div>
        <span className="text-xs font-medium text-muted-foreground">
          Risk: <span className="font-semibold text-foreground">{riskLevel(submission.analysis.counts)}</span>
        </span>
        <ReviewBadge status={submission.reviewStatus} />
        <Button asChild size="sm">
          <Link to="/review/$id" params={{ id: submission.id }}>
            <ClipboardCheck className="h-4 w-4" /> Review
          </Link>
        </Button>
      </div>
    </li>
  );
}


function ReviewCenterPage() {
  const state = useAppState();

  const isDetailPage = useMatch({
    from: "/review/$id",
    shouldThrow: false,
  });

  const pending = state.submissions
    .filter((s) => s.reviewStatus === "pending_review")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const decided = state.submissions
    .filter((s) => s.reviewStatus !== "pending_review")
    .sort((a, b) =>
      (b.review?.at ?? b.createdAt).localeCompare(
        a.review?.at ?? a.createdAt
      )
    );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!isDetailPage && (
        <>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Review Center
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Human reviewers always have the final decision — the analyzer only flags and suggests.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Waiting for review ({pending.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <EmptyState
                  icon={AlertTriangle}
                  title="Queue is clear"
                  description="No content is waiting for a human decision right now."
                  action={
                    <Button asChild variant="outline">
                      <Link to="/analyzer">
                        <ScanSearch className="h-4 w-4" /> Analyse new content
                      </Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {pending.map((s) => (
                    <ReviewRow key={s.id} submission={s} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {decided.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Decided ({decided.length}) ·{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    {summarizeCounts(
                      decided.reduce(
                        (acc, s) => ({
                          critical: acc.critical + s.analysis.counts.critical,
                          high: acc.high + s.analysis.counts.high,
                          medium: acc.medium + s.analysis.counts.medium,
                          low: acc.low + s.analysis.counts.low,
                        }),
                        { critical: 0, high: 0, medium: 0, low: 0 }
                      )
                    )} across queue history
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {decided.map((s) => (
                    <ReviewRow key={s.id} submission={s} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Outlet />
    </div>
  );
}
