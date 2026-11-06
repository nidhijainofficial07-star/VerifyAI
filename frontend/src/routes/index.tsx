import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSearch,
  ScanSearch,
  ShieldCheck,
} from "lucide-react";
import { useAppState } from "@/lib/store";
import { formatDateTime } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComplianceBadge, ReviewBadge } from "@/components/status-badges";
import { TrendChart } from "@/components/trend-chart";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "VerityAI — Dashboard" },
      {
        name: "description",
        content:
          "Brand governance dashboard: content checks, detected issues, pending reviews and approved content at a glance.",
      },
      { property: "og:title", content: "VerityAI — Dashboard" },
      {
        property: "og:description",
        content: "Content checks, detected issues, pending reviews and approved content at a glance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardContent className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground/80">{hint}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const state = useAppState();
  const submissions = state.submissions;

  const totalChecks = submissions.length;
  const issuesDetected = submissions.reduce(
    (sum, s) => sum + s.analysis.issues.length,
    0,
  );
  const pendingReviews = submissions.filter((s) => s.reviewStatus === "pending_review").length;
  const approved = submissions.filter((s) => s.reviewStatus === "approved").length;
  const recent = [...submissions]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back, {state.user.name.split(" ")[0]}! Let's keep your brand consistent.
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every piece of content is checked against your approved brand knowledge before it goes out.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ShieldCheck} label="Total Content Checks" value={totalChecks} hint="All-time analyses" />
        <StatCard icon={AlertTriangle} label="Issues Detected" value={issuesDetected} hint="Across all content" />
        <StatCard icon={Clock} label="Pending Reviews" value={pendingReviews} hint="Waiting on a human decision" />
        <StatCard icon={CheckCircle2} label="Approved Content" value={approved} hint="Cleared for publication" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="No content analysed yet"
                description="Submit your first piece of content in the Content Analyzer to see activity here."
                action={
                  <Button asChild>
                    <Link to="/analyzer">
                      <ScanSearch className="h-4 w-4" /> Analyse content
                    </Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y">
                {recent.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <Link
                        to="/reports/$id"
                        params={{ id: s.id }}
                        className="truncate text-sm font-medium hover:text-primary hover:underline"
                      >
                        {s.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(s.createdAt)} · {s.contentType}
                      </p>
                    </div>
                    <ComplianceBadge status={s.analysis.status} />
                    <span className="text-xs text-muted-foreground">
                      {s.analysis.issues.length === 0
                        ? "No issues"
                        : `${s.analysis.issues.length} issue${s.analysis.issues.length === 1 ? "" : "s"}`}
                    </span>
                    <ReviewBadge status={s.reviewStatus} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Button asChild className="justify-between">
                <Link to="/analyzer">
                  <span className="flex items-center gap-2">
                    <ScanSearch className="h-4 w-4" /> Analyse New Content
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link to="/brand-knowledge">
                  <span className="flex items-center gap-2">
                    <BookOpenText className="h-4 w-4" /> Manage Brand Knowledge
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="justify-between">
                <Link to="/review">
                  <span className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" /> Review Pending Issues
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content Compliance Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
