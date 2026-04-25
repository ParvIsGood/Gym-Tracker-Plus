import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell, Loader2, ArrowRight, Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth, getGuestId, hasUserToken } from "@/auth/context";
import { signupRequest } from "@/auth/api";

export default function Signup() {
  const [, setLocation] = useLocation();
  const { setUserToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [migrate, setMigrate] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showMigrateOption = !hasUserToken();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body: {
        username: string;
        password: string;
        displayName?: string;
        migrateGuestId?: string;
      } = { username, password };
      if (displayName) body.displayName = displayName;
      if (migrate && showMigrateOption) {
        body.migrateGuestId = getGuestId();
      }
      const res = await signupRequest(body);
      setUserToken(res.token);
      setLocation("/");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 409) {
        setError("That username is already taken.");
      } else if (status === 429) {
        setError("Too many signups from here. Wait a minute and try again.");
      } else if (status === 400) {
        setError(
          "Username must be 3–32 chars (letters, numbers, underscore). Password 6+ chars.",
        );
      } else {
        setError("Could not create account. Try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
            <Dumbbell size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-wider uppercase">
            Forge your account
          </h1>
          <p className="text-muted-foreground text-sm mt-1 text-center">
            Sync your training across every device
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-card border border-border rounded-2xl p-6 shadow-2xl shadow-primary/5"
        >
          <div className="space-y-2">
            <Label htmlFor="username" className="uppercase tracking-wider text-muted-foreground text-xs">
              Username
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
              className="h-12 bg-background"
              placeholder="lifter_99"
            />
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
              Letters, numbers, underscore. 3–32 chars.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="uppercase tracking-wider text-muted-foreground text-xs">
              Display name <span className="opacity-50">(optional)</span>
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              maxLength={48}
              className="h-12 bg-background"
              placeholder="Alex"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="uppercase tracking-wider text-muted-foreground text-xs">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              className="h-12 bg-background"
              placeholder="6+ characters"
            />
          </div>

          {showMigrateOption && (
            <label className="flex items-start gap-3 rounded-lg border border-border bg-background/40 p-3 cursor-pointer">
              <Checkbox
                checked={migrate}
                onCheckedChange={(v) => setMigrate(v === true)}
                className="mt-0.5"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Cloud size={14} className="text-primary" /> Keep my guest data
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Workouts, plan, body weight, water — all linked to this new account.
                </p>
              </div>
            </label>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          <Button
            type="submit"
            disabled={busy}
            className="w-full h-12 font-bold uppercase tracking-wider"
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>Create account <ArrowRight size={16} className="ml-2" /></>
            )}
          </Button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
          <Link
            href="/"
            className="block text-xs text-muted-foreground/70 hover:text-muted-foreground"
          >
            Continue as guest
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
