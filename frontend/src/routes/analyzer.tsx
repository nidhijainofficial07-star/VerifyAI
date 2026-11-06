import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles, ScanSearch } from "lucide-react";
import { toast } from "sonner";
import { analyzeContentViaApi } from "@/lib/api";
import { createSubmission} from "@/lib/store";
import { SAMPLE_CONTENT, SAMPLE_CONTENT_TITLE, SAMPLE_CONTENT_TYPE } from "@/lib/seed";
import type { ContentType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/analyzer")({
  head: () => ({
    meta: [
      { title: "VerityAI — Content Analyzer" },
      {
        name: "description",
        content: "Submit marketing content and verify it against your approved brand knowledge.",
      },
      { property: "og:title", content: "VerityAI — Content Analyzer" },
      {
        property: "og:description",
        content: "Submit marketing content and verify it against your approved brand knowledge.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyzerPage,
});

const CONTENT_TYPES: ContentType[] = [
  "Advertisement",
  "Social Media",
  "Blog",
  "Email",
  "Product Description",
];

function AnalyzerPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState<ContentType>("Advertisement");
  const [content, setContent] = useState("");
  const [analysing, setAnalysing] = useState(false);

  const fillSample = () => {
    setTitle(SAMPLE_CONTENT_TITLE);
    setContentType(SAMPLE_CONTENT_TYPE);
    setContent(SAMPLE_CONTENT);
    toast("Sample content loaded — press Analyse Content");
  };

  const analyse = async () => {
  if (!title.trim()) {
    toast.error("Please give the content a title.");
    return;
  }

  if (content.trim().length < 20) {
    toast.error("Content is too short to analyse. Paste at least a full sentence.");
    return;
  }

  setAnalysing(true);

  try {
    const result = await analyzeContentViaApi({
      title,
      contentType,
      content,
    });

    const id = createSubmission({
      id: result.reportId,
      title,
      contentType,
      content,
      analysis: result.analysis,
    });

    toast.success(
      result.analysis.issues.length
        ? "Analysis completed. Issues found."
        : "Analysis completed. No issues detected."
    );

    void navigate({ to: "/reports/$id", params: { id } });
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "Something went wrong during analysis."
    );
  } finally {
    setAnalysing(false);
  }
};
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Content Analyzer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
  Paste customer-facing content. VerityAI checks the approved SmartDesk product
  name, price and configured unsupported claims using its rule-based analysis engine.
</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit content</CardTitle>
          <CardDescription>
            The original content is never overwritten — you decide what to accept in the report.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="content-title">Content title</Label>
              <Input
                id="content-title"
                placeholder="e.g. SmartDesk Festive Launch Ad"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Content type</Label>
              <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="content-body">Content</Label>
              <span className="text-xs text-muted-foreground">{content.length} characters</span>
            </div>
            <Textarea
              id="content-body"
              placeholder="Paste the advertisement, social post, blog paragraph, email or product description here…"
              rows={9}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={analyse} disabled={analysing}>
              {analysing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" /> Analyse Content
                </>
              )}
            </Button>
            <Button variant="outline" onClick={fillSample} disabled={analysing}>
              <Sparkles className="h-4 w-4" /> Load Sample Content
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setTitle("");
                setContent("");
              }}
              disabled={analysing}
            >
              Clear
            </Button>
          </div>

          {analysing && (
            <p className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              Rule-based engine is checking the approved product name, prices and configured unsupported claims…
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
