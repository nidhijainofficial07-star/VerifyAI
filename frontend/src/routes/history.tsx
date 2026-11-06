import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { History, Search, ScanSearch } from "lucide-react";
import { useAppState } from "@/lib/store";
import { formatDateTime, riskLevel } from "@/lib/format";
import type { ReviewStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComplianceBadge, ReviewBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "VerityAI — History" },
      {
        name: "description",
        content: "Complete history of analysed content, compliance statuses and review decisions.",
      },
      { property: "og:title", content: "VerityAI — History" },
      {
        property: "og:description",
        content: "Complete history of analysed content, compliance statuses and review decisions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HistoryPage,
});

type Filter = "all" | "compliant" | "issues_found" | "pending_review" | "approved" | "rejected" | "changes_requested";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "All" },
  { key: "compliant", label: "Compliant" },
  { key: "issues_found", label: "Issues Found" },
  { key: "pending_review", label: "Pending Review" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "changes_requested", label: "Changes Requested" },
];

function matchesFilter(
  s: import("@/lib/types").Submission,
  filter: Filter,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "compliant":
      return s.analysis.status === "compliant";
    case "issues_found":
      return s.analysis.status === "issues_found";
    case "pending_review":
    case "approved":
    case "rejected":
    case "changes_requested":
      return s.reviewStatus === (filter as ReviewStatus);
  }
}

function HistoryPage() {
  const state = useAppState();
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    return state.submissions
      .filter((s) => matchesFilter(s, filter))
      .filter((s) => s.title.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [state.submissions, filter, query]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">History</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every piece of content analysed, with its compliance and review outcome.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by content title…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.length} record{rows.length === 1 ? "" : "s"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <EmptyState
              icon={History}
              title="Nothing matches"
              description={
                state.submissions.length === 0
                  ? "Analyse your first piece of content to start the history."
                  : "Try a different search term or filter."
              }
              action={
                <Button asChild variant="outline">
                  <Link to="/analyzer">
                    <ScanSearch className="h-4 w-4" /> Analyse content
                  </Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y">
              {rows.map((s) => (
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
                      Analysed {formatDateTime(s.createdAt)} · {s.contentType}
                      {s.review
                        ? ` · Decided by ${s.review.reviewer} on ${formatDateTime(s.review.at)}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {s.analysis.issues.length} issue{s.analysis.issues.length === 1 ? "" : "s"} · Risk{" "}
                    {riskLevel(s.analysis.counts)}
                  </span>
                  <ComplianceBadge status={s.analysis.status} />
                  <ReviewBadge status={s.reviewStatus} />
                  <Button asChild variant="outline" size="sm">
                    <Link to="/reports/$id" params={{ id: s.id }}>Open report</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
