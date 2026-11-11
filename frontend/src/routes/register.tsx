
import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { submitReviewerRequestViaApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState<"creator" | "reviewer">("creator");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setSubmitting(true);

    try {
      if (role === "creator") {
        await register(name.trim(), email.trim(), password);
        await navigate({ to: "/" });
      } else {
        const response = await submitReviewerRequestViaApi(
          name.trim(),
          email.trim(),
          password
        );

        setSuccess(
          response.message ||
          "Your Reviewer request has been submitted. Please wait for Admin approval."
        );

        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Button onClick={() => void navigate({ to: "/" })}>
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>

          <CardTitle className="text-2xl">
            Create your VerityAI account
          </CardTitle>

          <CardDescription>
            Choose how you want to use VerityAI.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-5 grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant={role === "creator" ? "default" : "outline"}
              onClick={() => {
                setRole("creator");
                setError("");
                setSuccess("");
              }}
            >
              Creator
            </Button>

            <Button
              type="button"
              variant={role === "reviewer" ? "default" : "outline"}
              onClick={() => {
                setRole("reviewer");
                setError("");
                setSuccess("");
              }}
            >
              Reviewer
            </Button>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            {role === "creator"
              ? "Create content and check it against brand guidelines."
              : "Request Reviewer access. An Admin must approve your request before you can sign in."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Enter your password again"
                autoComplete="new-password"
                required
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            {success && (
              <p className="text-sm text-green-600" role="status">
                {success}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : role === "creator"
                  ? "Create Creator Account"
                  : "Request Reviewer Access"}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
