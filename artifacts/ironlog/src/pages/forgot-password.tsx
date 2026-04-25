import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, KeyRound } from "lucide-react";

export default function ForgotPassword() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-background px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md text-center"
      >
        <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary mx-auto mb-6">
          <KeyRound size={28} strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-mono font-bold tracking-wider uppercase mb-2">
          Reset password
        </h1>
        <p className="text-muted-foreground text-sm mb-8 px-4">
          Password reset by email is coming soon. For now, reach out from your
          account if you've lost access — we'll get you back in.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
        >
          <ArrowLeft size={16} /> Back to sign in
        </Link>
      </motion.div>
    </div>
  );
}
