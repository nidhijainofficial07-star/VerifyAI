
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getBrandGuidelinesViaApi,
  saveBrandGuidelineViaApi,
  setBrandGuidelineActiveViaApi,
  deleteBrandGuidelineViaApi,
  getBrandFactsViaApi,
  saveBrandFactViaApi,
  deleteBrandFactViaApi,
  getBrandTerminologyViaApi,
  saveBrandTerminologyViaApi,
  deleteBrandTerminologyViaApi,
} from "@/lib/api";
import {
  CheckCircle2,
  CircleAlert,
  FileUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import {
  addDocument,
  deleteDocument,
  deleteFact,
  deleteGuideline,
  deleteTerminology,
  saveFact,
  saveGuideline,
  saveTerminology,
  toggleGuideline,
  useAppState,
} from "@/lib/store";
import type {
  BrandGuideline,
  ProductFact,
  Severity,
  TerminologyEntry,
} from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SeverityBadge } from "@/components/status-badges";
import { EmptyState } from "@/components/empty-state";

export const Route = createFileRoute("/brand-knowledge")({
  head: () => ({
    meta: [
      { title: "VerityAI — Brand Knowledge" },
      {
        name: "description",
        content:
          "Manage approved brand guidelines, product facts, terminology and guideline documents.",
      },
      { property: "og:title", content: "VerityAI — Brand Knowledge" },
      {
        property: "og:description",
        content:
          "Manage approved brand guidelines, product facts, terminology and guideline documents.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BrandKnowledgePage,
});

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

const emptyGuideline = {
  title: "",
  description: "",
  category: "Tone of Voice",
  rule: "",
  severity: "medium" as Severity,
  active: true,
};


function GuidelinesTab() {
  const { user, loading } = useAuth();
  const canManage = !loading && user?.role === "admin";

  const [guidelines, setGuidelines] = useState<BrandGuideline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editing, setEditing] = useState<BrandGuideline | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyGuideline);
  const [confirmDelete, setConfirmDelete] =
    useState<BrandGuideline | null>(null);

  // Load guidelines from PostgreSQL backend
  const loadGuidelines = async () => {
    try {
      const data = await getBrandGuidelinesViaApi();
      setGuidelines(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load guidelines."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGuidelines();
  }, []);

  const openCreate = () => {
    if (!canManage) return;
    setForm(emptyGuideline);
    setCreating(true);
  };

  const openEdit = (g: BrandGuideline) => {
    if (!canManage) return;

    setForm({
      title: g.title,
      description: g.description,
      category: g.category,
      rule: g.rule,
      severity: g.severity,
      active: g.active,
    });

    setEditing(g);
  };

  // Create or update guideline
  const save = async () => {
    if (!canManage) return;

    if (!form.title.trim() || !form.rule.trim()) {
      toast.error("Title and rule are required.");
      return;
    }

    try {
      await saveBrandGuidelineViaApi(form, editing?.id);

      await loadGuidelines();

      toast.success(
        editing ? "Guideline updated" : "Guideline added"
      );

      setCreating(false);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save guideline."
      );
    }
  };

  // Activate or deactivate guideline
  const toggleActive = async (g: BrandGuideline) => {
    if (!canManage) return;

    try {
      await setBrandGuidelineActiveViaApi(g.id, !g.active);
      await loadGuidelines();

      toast.success(
        g.active ? "Guideline deactivated" : "Guideline activated"
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not update guideline."
      );
    }
  };

  // Soft delete guideline
  const handleDelete = async () => {
    if (!canManage || !confirmDelete) return;

    try {
      await deleteBrandGuidelineViaApi(confirmDelete.id);
      await loadGuidelines();

      toast.success("Guideline deleted");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete guideline."
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Brand Guidelines</CardTitle>
          <CardDescription>
            Rules every piece of content is checked against.
          </CardDescription>
        </div>

        {canManage && (
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add guideline
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading guidelines...
          </p>
        ) : guidelines.length === 0 ? (
          <EmptyState
            icon={CircleAlert}
            title="No guidelines yet"
            description="Add your first brand guideline so the analyzer has rules to check against."
          />
        ) : (
          <ul className="space-y-3">
            {guidelines.map((g) => (
              <li key={g.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-semibold">{g.title}</h4>
                      <SeverityBadge severity={g.severity} />
                      <Badge variant="outline">{g.category}</Badge>

                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          g.active
                            ? "text-accent-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {g.active ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        {g.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {g.description}
                    </p>

                    <p className="mt-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-sm">
                      {g.rule}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      <Switch
                        checked={g.active}
                        onCheckedChange={() => toggleActive(g)}
                        aria-label="Toggle guideline"
                      />

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(g)}
                        aria-label="Edit guideline"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(g)}
                        aria-label="Delete guideline"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog
        open={canManage && (creating || editing !== null)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit guideline" : "New guideline"}
            </DialogTitle>
            <DialogDescription>
              Rules marked active are enforced by the content analyzer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value })
                }
                placeholder="e.g. No Exaggerated Promotional Language"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What this guideline covers"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Severity</Label>
                <Select
                  value={form.severity}
                  onValueChange={(v) =>
                    setForm({ ...form, severity: v as Severity })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem
                        key={s}
                        value={s}
                        className="capitalize"
                      >
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Rule / instruction</Label>
              <Textarea
                value={form.rule}
                onChange={(e) =>
                  setForm({ ...form, rule: e.target.value })
                }
                rows={3}
                placeholder="e.g. Never use unverified superlatives such as No. 1 without approved evidence."
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border px-3 py-2">
              <Label htmlFor="gl-active" className="cursor-pointer">
                Active
              </Label>
              <Switch
                id="gl-active"
                checked={form.active}
                onCheckedChange={(v) =>
                  setForm({ ...form, active: v })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>

            <Button onClick={save}>Save guideline</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canManage && confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete guideline?</DialogTitle>
            <DialogDescription>
              “{confirmDelete?.title}” will be removed from the analyzer's
              rule set. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const emptyFact = {
  productName: "",
  approvedPrice: "",
  specification: "",
  approvedDescription: "",
};


function FactsTab() {
  const { user, loading } = useAuth();
  const canManage = !loading && user?.role === "admin";

  const [facts, setFacts] = useState<ProductFact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editing, setEditing] = useState<ProductFact | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyFact);
  const [confirmDelete, setConfirmDelete] =
    useState<ProductFact | null>(null);

  // Load product facts from PostgreSQL
  const loadFacts = async () => {
    try {
      const data = await getBrandFactsViaApi();
      setFacts(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load product facts."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadFacts();
  }, []);

  // Create or update product facts
  const save = async () => {
    if (!canManage) return;

    if (!form.productName.trim() || !form.approvedPrice.trim()) {
      toast.error("Product name and approved price are required.");
      return;
    }

    try {
      await saveBrandFactViaApi(form, editing?.id);

      await loadFacts();

      toast.success(
        editing ? "Product facts updated" : "Product added"
      );

      setCreating(false);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save product facts."
      );
    }
  };

  // Soft delete product fact
  const handleDelete = async () => {
    if (!canManage || !confirmDelete) return;

    try {
      await deleteBrandFactViaApi(confirmDelete.id);

      await loadFacts();

      toast.success("Product record deleted");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete product record."
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            Approved Product Facts
          </CardTitle>
          <CardDescription>
            The single source of truth the analyzer verifies prices and names
            against.
          </CardDescription>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setForm(emptyFact);
              setCreating(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add product
          </Button>
        )}
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading product facts...
          </p>
        ) : facts.length === 0 ? (
          <EmptyState
            icon={CircleAlert}
            title="No product facts yet"
            description="Add an approved product record so price and name checks can run."
          />
        ) : (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-semibold">Product Name</th>
                <th className="py-2 pr-4 font-semibold">Approved Price</th>
                <th className="py-2 pr-4 font-semibold">Specification</th>
                <th className="py-2 pr-4 font-semibold">
                  Approved Description
                </th>
                <th className="py-2 pr-4 font-semibold">Last Updated</th>
                {canManage && (
                  <th className="py-2 font-semibold text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y">
              {facts.map((f) => (
                <tr key={f.id}>
                  <td className="py-3 pr-4 font-medium">
                    {f.productName}
                  </td>

                  <td className="py-3 pr-4 font-mono">
                    {f.approvedPrice}
                  </td>

                  <td className="py-3 pr-4 text-muted-foreground">
                    {f.specification}
                  </td>

                  <td className="py-3 pr-4 text-muted-foreground">
                    {f.approvedDescription}
                  </td>

                  <td className="py-3 pr-4 text-xs text-muted-foreground">
                    {formatDateTime(f.updatedAt)}
                  </td>

                  {canManage && (
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setForm({
                            productName: f.productName,
                            approvedPrice: f.approvedPrice,
                            specification: f.specification,
                            approvedDescription: f.approvedDescription,
                          });
                          setEditing(f);
                        }}
                        aria-label={`Edit ${f.productName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(f)}
                        aria-label={`Delete ${f.productName}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog
        open={canManage && (creating || editing !== null)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit product facts" : "New product record"}
            </DialogTitle>

            <DialogDescription>
              Prices stated in submitted content are checked against this
              record.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Product name</Label>
                <Input
                  value={form.productName}
                  onChange={(e) =>
                    setForm({ ...form, productName: e.target.value })
                  }
                  placeholder="e.g. SmartDesk"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Approved price</Label>
                <Input
                  value={form.approvedPrice}
                  onChange={(e) =>
                    setForm({ ...form, approvedPrice: e.target.value })
                  }
                  placeholder="e.g. ₹5,000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Specifications</Label>
              <Input
                value={form.specification}
                onChange={(e) =>
                  setForm({ ...form, specification: e.target.value })
                }
                placeholder="e.g. Height adjustable; oak finish."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Approved description</Label>
              <Textarea
                value={form.approvedDescription}
                onChange={(e) =>
                  setForm({
                    ...form,
                    approvedDescription: e.target.value,
                  })
                }
                rows={2}
                placeholder="e.g. Ergonomic workstation for everyday use."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>

            <Button onClick={save}>Save product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canManage && confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product record?</DialogTitle>

            <DialogDescription>
              “{confirmDelete?.productName}” will no longer be used for price
              and name verification.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

const emptyTerm = {
  preferred: "",
  restricted: "",
  alternative: "",
};


function TerminologyTab() {
  const { user, loading } = useAuth();
  const canManage = !loading && user?.role === "admin";

  const [terminology, setTerminology] = useState<TerminologyEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [editing, setEditing] = useState<TerminologyEntry | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyTerm);
  const [confirmDelete, setConfirmDelete] =
    useState<TerminologyEntry | null>(null);

  // Load terminology from PostgreSQL
  const loadTerminology = async () => {
    try {
      const data = await getBrandTerminologyViaApi();
      setTerminology(data);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not load terminology."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTerminology();
  }, []);

  // Create or update terminology
  const save = async () => {
    if (!canManage) return;

    if (!form.restricted.trim() || !form.preferred.trim()) {
      toast.error("Preferred and restricted terms are required.");
      return;
    }

    try {
      await saveBrandTerminologyViaApi(form, editing?.id);

      await loadTerminology();

      toast.success(
        editing ? "Terminology updated" : "Terminology added"
      );

      setCreating(false);
      setEditing(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not save terminology."
      );
    }
  };

  // Soft delete terminology
  const handleDelete = async () => {
    if (!canManage || !confirmDelete) return;

    try {
      await deleteBrandTerminologyViaApi(confirmDelete.id);

      await loadTerminology();

      toast.success("Terminology rule deleted");
      setConfirmDelete(null);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not delete terminology."
      );
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="text-base">
            Approved Terminology
          </CardTitle>
          <CardDescription>
            Restricted words and their approved alternatives.
          </CardDescription>
        </div>

        {canManage && (
          <Button
            onClick={() => {
              setForm(emptyTerm);
              setCreating(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add term
          </Button>
        )}
      </CardHeader>

      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Loading terminology...
          </p>
        ) : terminology.length === 0 ? (
          <EmptyState
            icon={CircleAlert}
            title="No terminology rules yet"
            description="Add restricted terms so the analyzer can flag them in content."
          />
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th className="py-2 pr-4 font-semibold">Preferred Term</th>
                <th className="py-2 pr-4 font-semibold">
                  Restricted / Prohibited
                </th>
                <th className="py-2 pr-4 font-semibold">
                  Approved Alternative
                </th>
                {canManage && (
                  <th className="py-2 font-semibold text-right">
                    Actions
                  </th>
                )}
              </tr>
            </thead>

            <tbody className="divide-y">
              {terminology.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 pr-4 font-medium">
                    {t.preferred}
                  </td>

                  <td className="py-3 pr-4">
                    <Badge variant="destructive">
                      {t.restricted}
                    </Badge>
                  </td>

                  <td className="py-3 pr-4 text-muted-foreground">
                    {t.alternative}
                  </td>

                  {canManage && (
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setForm({
                            preferred: t.preferred,
                            restricted: t.restricted,
                            alternative: t.alternative,
                          });
                          setEditing(t);
                        }}
                        aria-label={`Edit ${t.restricted}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(t)}
                        aria-label={`Delete ${t.restricted}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardContent>

      <Dialog
        open={canManage && (creating || editing !== null)}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit terminology rule" : "New terminology rule"}
            </DialogTitle>
            <DialogDescription>
              The analyzer flags restricted terms wherever they appear in
              content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Preferred term</Label>
              <Input
                value={form.preferred}
                onChange={(e) =>
                  setForm({ ...form, preferred: e.target.value })
                }
                placeholder="e.g. value-driven pricing"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Restricted term</Label>
              <Input
                value={form.restricted}
                onChange={(e) =>
                  setForm({ ...form, restricted: e.target.value })
                }
                placeholder="e.g. cheap"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Approved alternative</Label>
              <Input
                value={form.alternative}
                onChange={(e) =>
                  setForm({ ...form, alternative: e.target.value })
                }
                placeholder="e.g. affordable"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>

            <Button onClick={save}>Save term</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canManage && confirmDelete !== null}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete terminology rule?</DialogTitle>
            <DialogDescription>
              “{confirmDelete?.restricted}” will no longer be flagged in
              submitted content.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setConfirmDelete(null)}
            >
              Cancel
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


const DOC_STATUS = {
  indexed: {
    label: "Indexed",
    icon: CheckCircle2,
    className: "text-accent-foreground",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    className: "text-info",
  },
  failed: {
    label: "Failed",
    icon: TriangleAlert,
    className: "text-destructive",
  },
} as const;

function DocumentsTab() {
  const state = useAppState();
  const { user, loading } = useAuth();
  const canManage = !loading && user?.role === "admin";

  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!canManage || !files?.length) return;

    Array.from(files).forEach((file) => {
      const ok = /\.(pdf|docx?|xlsx?|txt|md)$/i.test(file.name);

      if (!ok) {
        toast.error(
          `${file.name}: unsupported format. Upload PDF, DOCX, XLSX, TXT or MD.`
        );
        return;
      }

      addDocument(file.name);
      toast.success(`${file.name} uploaded — indexing started (demo)`);
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Guideline Documents</CardTitle>
        <CardDescription>
          Upload brand guideline documents. In this MVP they are registered
          and indexed in demo mode — document parsing connects to the backend
          later.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {canManage && (
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFiles(e.dataTransfer.files);
            }}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
              dragging
                ? "border-primary bg-secondary"
                : "hover:bg-muted/50"
            }`}
          >
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">
              Drop guideline documents here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              PDF, DOCX, XLSX, TXT or MD — up to demo limits
            </p>
            <input
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.md"
              className="sr-only"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}

        {state.documents.length === 0 ? (
          <EmptyState
            icon={FileUp}
            title="No documents uploaded"
            description="Upload your brand guidelines so they can be indexed for semantic retrieval later."
          />
        ) : (
          <ul className="divide-y rounded-xl border">
            {state.documents.map((d) => {
              const status = DOC_STATUS[d.status];

              return (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <FileUp className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.sizeLabel} · {formatDateTime(d.uploadedAt)}
                    </p>
                  </div>

                  <span
                    className={`flex items-center gap-1.5 text-xs font-medium ${status.className}`}
                  >
                    <status.icon
                      className={`h-3.5 w-3.5 ${
                        d.status === "processing" ? "animate-spin" : ""
                      }`}
                    />
                    {status.label}
                  </span>

                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        deleteDocument(d.id);
                        toast.success("Document removed");
                      }}
                      aria-label={`Delete ${d.name}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BrandKnowledgePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Brand Knowledge
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The approved information every content check is measured against.
        </p>
      </div>

      <Tabs defaultValue="guidelines">
        <TabsList>
          <TabsTrigger value="guidelines">Guidelines</TabsTrigger>
          <TabsTrigger value="facts">Product Facts</TabsTrigger>
          <TabsTrigger value="terminology">Terminology</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="guidelines">
          <GuidelinesTab />
        </TabsContent>

        <TabsContent value="facts">
          <FactsTab />
        </TabsContent>

        <TabsContent value="terminology">
          <TerminologyTab />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
