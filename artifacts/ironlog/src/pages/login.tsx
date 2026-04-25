import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Dumbbell, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/auth/context";
import { loginRequest } from "@/auth/api";

export default function Login() {
  const [, setLocation] = useLocation();
  const { setUserToken } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await loginRequest({ username, password });
      setUserToken(res.token);
      setLocation("/");
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 429) {
        setError("Too many attempts. Slow down for a minute, then try again.");
      } else if (status === 401) {
        setError("Wrong username or password.");
      } else {
        setError("Could not log in. Try again in a moment.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mb-4">
            <Dumbbell size={28} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-mono font-bold tracking-wider uppercase">
            IronLog
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Sign in to sync across devices
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
              className="h-12 bg-background"
              placeholder="lifter_99"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="uppercase tracking-wider text-muted-foreground text-xs">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                Forgot?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              minLength={6}
              className="h-12 bg-background"
              placeholder="••••••••"
            />
          </div>

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
              <>Sign in <ArrowRight size={16} className="ml-2" /></>
            )}
          </Button>
        </form>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/signup" className="text-primary font-semibold hover:underline">
              Create account
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
