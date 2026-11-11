import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";

import {
  createReviewerViaApi,
  getAdminStatsViaApi,
  getReviewersViaApi,
  deleteReviewerViaApi,
  getSubmissionsViaApi,
  getReviewerRequestsViaApi,
  decideReviewerRequestViaApi,
  type AdminStats,
  type Reviewer,
} from "@/lib/api";

import type { Submission } from "@/lib/types";
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
import { formatDateTime } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ComplianceBadge, ReviewBadge } from "@/components/status-badges";
import { TrendChart } from "@/components/trend-chart";
import { EmptyState } from "@/components/empty-state";

type ReviewerRequest = {
  id: number;
  name: string;
  email: string;
  status: "pending";
  created_at: string;
};


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

  const [reviewerRequests, setReviewerRequests] = useState<ReviewerRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const [processingRequestId, setProcessingRequestId] = useState<number | null>(null);
  const [requestMessage, setRequestMessage] = useState("");

  const [reviewerName, setReviewerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
const [reviewersLoading, setReviewersLoading] = useState(true);
const [reviewersError, setReviewersError] = useState("");
const [removingReviewerId, setRemovingReviewerId] = useState<number | null>(null);
const [reviewerSuccess, setReviewerSuccess] = useState("");

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

  async function loadReviewers() {
  setReviewersLoading(true);
  setReviewersError("");

  try {
    const data = await getReviewersViaApi();
    setReviewers(data);
  } catch (err) {
    setReviewersError(
      err instanceof Error ? err.message : "Could not load reviewers."
    );
  } finally {
    setReviewersLoading(false);
  }
}

  async function loadReviewerRequests() {
    setRequestsLoading(true);
    setRequestsError("");

    try {
      const data = await getReviewerRequestsViaApi();
      setReviewerRequests(data.requests ?? []);
    } catch (err) {
      setRequestsError(
        err instanceof Error
          ? err.message
          : "Could not load Reviewer requests."
      );
    } finally {
      setRequestsLoading(false);
    }
  }

  useEffect(() => {
  void loadStats();
  void loadReviewers();
  void loadReviewerRequests();
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
    await loadReviewers();
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

  async function handleDeleteReviewer(reviewer: Reviewer) {
  const confirmed = window.confirm(
    `Remove ${reviewer.name} (${reviewer.email})? They will no longer be able to log in. Their previous reviews will be preserved.`
  );

  if (!confirmed) return;

  setRemovingReviewerId(reviewer.id);
  setReviewersError("");
  setReviewerSuccess("");

  try {
    await deleteReviewerViaApi(reviewer.id);

    setReviewerSuccess(`${reviewer.name} has been removed successfully.`);

    await loadReviewers();
    await loadStats();
    await loadReviewers();
  } catch (err) {
    setReviewersError(
      err instanceof Error ? err.message : "Could not remove reviewer."
    );
  } finally {
    setRemovingReviewerId(null);
  }
}

  async function handleReviewerDecision(
    requestId: number,
    decision: "approve" | "reject"
  ) {
    const confirmed = window.confirm(
      decision === "approve"
        ? "Approve this Reviewer request?"
        : "Reject this Reviewer request?"
    );

    if (!confirmed) return;

    setProcessingRequestId(requestId);
    setRequestsError("");
    setRequestMessage("");

    try {
      const result = await decideReviewerRequestViaApi(
        requestId,
        decision
      );

      setRequestMessage(result.message);

      await loadReviewerRequests();

      if (decision === "approve") {
        await loadReviewers();
        await loadStats();
      }
    } catch (err) {
      setRequestsError(
        err instanceof Error
          ? err.message
          : "Could not process this request."
      );
    } finally {
      setProcessingRequestId(null);
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
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Pending Reviewer Requests
            </CardTitle>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadReviewerRequests()}
              disabled={requestsLoading}
            >
              {requestsLoading ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Review and approve or reject access requests.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {requestsError && (
            <p className="text-sm text-destructive" role="alert">
              {requestsError}
            </p>
          )}

          {requestMessage && (
            <p className="text-sm text-green-600" role="status">
              {requestMessage}
            </p>
          )}

          {requestsLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading requests...
            </p>
          ) : reviewerRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending Reviewer requests.
            </p>
          ) : (
            <div className="divide-y">
              {reviewerRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Requested: {formatDateTime(request.created_at)}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={processingRequestId === request.id}
                      onClick={() =>
                        void handleReviewerDecision(request.id, "approve")
                      }
                    >
                      {processingRequestId === request.id
                        ? "Processing..."
                        : "Approve"}
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={processingRequestId === request.id}
                      onClick={() =>
                        void handleReviewerDecision(request.id, "reject")
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Manage Reviewers
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            View and manage active reviewer accounts.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {reviewersError && (
            <p className="text-sm text-destructive">{reviewersError}</p>
          )}

          {reviewerSuccess && (
            <p className="text-sm text-green-600">{reviewerSuccess}</p>
          )}

          {reviewersLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading reviewers...
            </p>
          ) : reviewers.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active reviewers found.
            </p>
          ) : (
            <div className="divide-y">
              {reviewers.map((reviewer) => (
                <div
                  key={reviewer.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{reviewer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {reviewer.email}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removingReviewerId === reviewer.id}
                    onClick={() => void handleDeleteReviewer(reviewer)}
                  >
                    {removingReviewerId === reviewer.id
                      ? "Removing..."
                      : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
const [reportsLoading, setReportsLoading] = useState(true);
const [reportsError, setReportsError] = useState("");

useEffect(() => {
  if (!user || user.role === "admin") return;


  async function loadReports() {
    setReportsLoading(true);
    setReportsError("");

    try {
      const data = await getSubmissionsViaApi();
      setSubmissions(data);
    } catch (err) {
      setReportsError(
        err instanceof Error ? err.message : "Could not load reports."
      );
    } finally {
      setReportsLoading(false);
    }
  }

  void loadReports();
}, [user]);

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login", replace: true });
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Checking your login...
        </p>
      </div>
    );
  }

    if (user.role === "admin") {
    return <AdminDashboard name={user.name} />;
  }
if (reportsLoading) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <p className="text-sm text-muted-foreground">
        Loading your reports...
      </p>
    </div>
  );
}

if (reportsError) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <p className="text-sm text-destructive">{reportsError}</p>
      <Button onClick={() => window.location.reload()} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);

  const totalChecks = submissions.length;

  const issuesDetected = submissions.reduce(
    (sum, s) => sum + s.analysis.issues.length,
    0,
  );

  const pendingReviews = submissions.filter(
    (s) => s.reviewStatus === "pending_review"
  ).length;

  const approved = submissions.filter(
    (s) => s.reviewStatus === "approved"
  ).length;

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
