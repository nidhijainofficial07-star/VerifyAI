
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Building2,
  Bell,
  Info,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { clearSubmissions, updateOrg, useAppState } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "VerityAI — Settings" },
      {
        name: "description",
        content:
          "Organisation profile, user information, notification preferences and application info.",
      },
      { property: "og:title", content: "VerityAI — Settings" },
      {
        property: "og:description",
        content:
          "Organisation profile, user information, notification preferences and application info.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function OrgProfileCard() {
  const state = useAppState();
  const [name, setName] = useState(state.org.name);
  const [industry, setIndustry] = useState(state.org.industry);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4 text-primary" />
          Organisation profile
        </CardTitle>
        <CardDescription>
          Organisation details used across this browser workspace.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label>Organisation name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </div>

        <Button
          onClick={() => {
            if (!name.trim()) {
              toast.error("Organisation name cannot be empty.");
              return;
            }

            updateOrg({
              name: name.trim(),
              industry: industry.trim(),
            });

            toast.success("Organisation profile saved locally");
          }}
        >
          Save profile
        </Button>
      </CardContent>
    </Card>
  );
}

function UserInfoCard() {
  const { user } = useAuth();

  const roleLabel = user?.role
    ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
    : "Not available";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="h-4 w-4 text-primary" />
          User information
        </CardTitle>
        <CardDescription>
          Account details from your authenticated VerityAI account.
          Reviewer identity is recorded with review decisions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input value={user?.name ?? ""} readOnly disabled />
          </div>

          <div className="space-y-1.5">
            <Label>Role</Label>
            <Input value={roleLabel} readOnly disabled />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email ?? ""} readOnly disabled />
        </div>

        <p className="text-xs text-muted-foreground">
          Your account identity and role are managed securely by the
          authentication system. Contact an administrator if your account
          details need to be changed.
        </p>
      </CardContent>
    </Card>
  );
}

function NotificationsCard() {
  const [prefs, setPrefs] = useState({
    newIssues: true,
    pendingReviews: true,
    weeklyDigest: false,
  });

  const set = (key: keyof typeof prefs) => (value: boolean) => {
    setPrefs((previous) => ({
      ...previous,
      [key]: value,
    }));

    toast.success("Local notification preference updated");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="h-4 w-4 text-primary" />
          Notification preferences
        </CardTitle>
        <CardDescription>
          Local preferences only. Email notifications are not connected yet.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        {(
          [
            ["newIssues", "Notify me when critical issues are detected"],
            ["pendingReviews", "Notify me when content is waiting for review"],
            ["weeklyDigest", "Send a weekly brand compliance digest"],
          ] as const
        ).map(([key, label]) => (
          <div
            key={key}
            className="flex items-center justify-between rounded-lg border px-3 py-2.5"
          >
            <Label
              htmlFor={`pref-${key}`}
              className="cursor-pointer text-sm font-normal"
            >
              {label}
            </Label>

            <Switch
              id={`pref-${key}`}
              checked={prefs[key]}
              onCheckedChange={set(key)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AppInfoCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4 text-primary" />
          Application information
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Product</span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            VerityAI
          </span>
        </div>

        <Separator />

        <div className="flex justify-between">
          <span>Tagline</span>
          <span className="text-foreground">
            Every Brand Decision, Verified.
          </span>
        </div>

        <Separator />

        <div className="flex justify-between gap-4">
          <span>Analysis engine</span>
          <span className="text-right text-foreground">
            Deterministic rule-based engine
          </span>
        </div>

        <Separator />

        <div className="flex justify-between gap-4">
          <span>Backend</span>
          <span className="text-foreground">FastAPI</span>
        </div>

        <Separator />

        <div className="flex justify-between gap-4">
          <span>Database</span>
          <span className="text-right text-foreground">
            Neon PostgreSQL
          </span>
        </div>

        <Separator />

        <p className="pt-1 text-xs">
          Authentication, content analysis, reports and review decisions
          are connected to the backend. Organisation profile and
          notification preferences are currently browser-local.
          Gemini integration, document processing and email notifications
          are not implemented.
        </p>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="mt-2">
              <RotateCcw className="h-4 w-4" />
              Reset local demo submissions
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Reset local demo submissions?
              </AlertDialogTitle>

              <AlertDialogDescription>
                This clears locally stored demo submissions only.
                It does not delete authenticated reports or records
                stored in the Neon database.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>

              <AlertDialogAction
                onClick={() => {
                  clearSubmissions();
                  toast.success("Local demo submissions cleared");
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">
          Settings
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Organisation profile, account information and preferences.
        </p>
      </div>

      <OrgProfileCard />
      <UserInfoCard />
      <NotificationsCard />
      <AppInfoCard />
    </div>
  );
}
