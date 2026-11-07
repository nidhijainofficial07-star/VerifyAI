import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import {
  createReviewerViaApi,
  getAdminStatsViaApi,
  type AdminStats,
} from "@/lib/api";

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
import { useAuth } from "@/lib/auth-context";
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

function AdminDashboard({ name }: { name: string }) {
  const [reviewerName, setReviewerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  async function loadStats() {
    setStatsLoading(true);
    setStatsError("");

    try {
      const data = await getAdminStatsViaApi();
      setStats(data);
    } catch (err) {
      setStatsError(
        err instanceof Error ? err.message : "Could not load statistics."
      );
    } finally {
      setStatsLoading(false);
    }
  }

  useEffect(() => {
    void loadStats();
  }, []);

  async function handleCreateReviewer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      await createReviewerViaApi(reviewerName, email, password);

      setSuccess(`Reviewer account created successfully for ${email}.`);
      setReviewerName("");
      setEmail("");
      setPassword("");

      await loadStats();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create reviewer account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Welcome back, {name.split(" ")[0]}!
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Admin Dashboard — Manage reviewer access and oversee VerityAI.
        </p>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Platform Overview</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadStats()}
            disabled={statsLoading}
          >
            {statsLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {statsError && (
          <p className="mb-4 text-sm text-destructive">{statsError}</p>
        )}

        {statsLoading && !stats && (
          <p className="text-sm text-muted-foreground">
            Loading platform statistics...
          </p>
        )}

        {stats && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={ShieldCheck}
              label="Total Users"
              value={stats.users.total}
              hint="Active platform accounts"
            />
            <StatCard
              icon={BookOpenText}
              label="Creators"
              value={stats.users.creators}
              hint="Content creators"
            />
            <StatCard
              icon={ClipboardCheck}
              label="Reviewers"
              value={stats.users.reviewers}
              hint="Review team accounts"
            />
            <StatCard
              icon={ShieldCheck}
              label="Administrators"
              value={stats.users.admins}
              hint="Admin accounts"
            />
            <StatCard
              icon={FileSearch}
              label="Total Reports"
              value={stats.reports.total}
              hint="All submitted analyses"
            />
            <StatCard
              icon={Clock}
              label="Pending Reviews"
              value={stats.reports.pending}
              hint="Awaiting human decisions"
            />
            <StatCard
              icon={CheckCircle2}
              label="Completed Reviews"
              value={stats.reports.completed}
              hint="Approved, rejected or changes requested"
            />
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4">
            <ShieldCheck className="h-9 w-9 text-primary" />
            <div>
              <p className="font-semibold">Administrator</p>
              <p className="text-sm text-muted-foreground">
                Full administrative access
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <ClipboardCheck className="h-9 w-9 text-primary" />
            <div>
              <p className="font-semibold">Reviewer Management</p>
              <p className="text-sm text-muted-foreground">
                Create accounts for brand reviewers
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Create New Reviewer
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Create a reviewer account. The reviewer can then log in using the
            shared VerityAI login page.
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCreateReviewer} className="max-w-xl space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                required
                minLength={2}
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                placeholder="Enter reviewer name"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reviewer@example.com"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Temporary Password</label>
              <input
                required
                type="password"
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a strong password"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            {success && (
              <p className="text-sm text-green-600">{success}</p>
            )}

            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Reviewer Account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const state = useAppState();
const { user } = useAuth();
if (user?.role === "admin") {
  return <AdminDashboard name={user.name} />;
}
const submissions = state.submissions;

const roleLabel = user?.role
  ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
  : "";

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
    Welcome back, {user?.name?.split(" ")[0] || "User"}!
  </h2>

  <p className="mt-1 text-sm text-muted-foreground">
    You are logged in as{" "}
    <span className="font-medium text-primary">{roleLabel}</span>.
    Every brand decision deserves to be verified.
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
