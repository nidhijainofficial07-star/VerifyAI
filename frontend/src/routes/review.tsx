import {
  createFileRoute,
  Link,
  Outlet,
  useMatch,
  useNavigate,
} from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { getSubmissionsViaApi } from "@/lib/api";
import { AlertTriangle, ClipboardCheck, ScanSearch } from "lucide-react";
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
  const pendingIssues = submission.analysis.issues.filter(
    (i) => i.resolution === "pending"
  ).length;

  return (
    <li className="rounded-xl border bg-card p-3 transition-colors hover:bg-muted/20 sm:p-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              to="/review/$id"
              params={{ id: submission.id }}
              className="block break-words text-sm font-semibold hover:text-primary hover:underline sm:text-base"
            >
              {submission.title}
            </Link>

            <p className="mt-1 text-xs text-muted-foreground">
              Submitted {formatDateTime(submission.createdAt)} ·{" "}
              {submission.contentType}
            </p>
          </div>

          <Button asChild size="sm">
            <Link to="/review/$id" params={{ id: submission.id }}>
              <ClipboardCheck className="h-4 w-4" />
              Review
            </Link>
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ReviewBadge status={submission.reviewStatus} />

          <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">
            Risk: {riskLevel(submission.analysis.counts)}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <span className="text-xs font-medium">
            {submission.analysis.issues.length} issue
            {submission.analysis.issues.length === 1 ? "" : "s"}
          </span>

          {pendingIssues > 0 && (
            <span className="text-xs text-muted-foreground">
              {pendingIssues} awaiting decision
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function ReviewCenterPage() {
  const { user, loading: authLoading } = useAuth();
const navigate = useNavigate();

useEffect(() => {
  if (authLoading) return;

  if (!user) {
    navigate({ to: "/login", replace: true });
  } else if (user.role !== "reviewer" && user.role !== "admin") {
    navigate({ to: "/", replace: true });
  }
}, [authLoading, user, navigate]);
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

  if (
  authLoading ||
  !user ||
  (user.role !== "reviewer" && user.role !== "admin")
) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Checking access...
      </p>
    </div>
  );
}

  const isDetailPage = useMatch({
    from: "/review/$id",
    shouldThrow: false,
  });

  const pending = submissions
  .filter((s) => s.reviewStatus === "pending_review")
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

const decided = submissions
  .filter((s) => s.reviewStatus !== "pending_review")
  .sort((a, b) =>
    (b.review?.at ?? b.createdAt).localeCompare(
      a.review?.at ?? a.createdAt
    )
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {!isDetailPage && loading && (
  <p className="text-sm text-muted-foreground">
    Loading review queue...
  </p>
)}

{!isDetailPage && error && (
  <p className="text-sm text-destructive">
    {error}
  </p>
)}
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
{!loading && !error && pending.length === 0 ? (
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
) : !loading && !error && pending.length > 0 ? (
  <ul className="space-y-3">
    {pending.map((s) => (
      <ReviewRow key={s.id} submission={s} />
    ))}
  </ul>
) : null}
            </CardContent>
          </Card>

          {!loading && !error && decided.length > 0 && (
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
