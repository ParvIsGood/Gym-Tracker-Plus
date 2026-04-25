import { useEffect, useState } from "react";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function SyncStatus({ compact = false }: { compact?: boolean }) {
  const fetchingCount = useIsFetching();
  const mutatingCount = useIsMutating();
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem("ironlog.lastSyncedAt");
    return v ? Number(v) : null;
  });

  useEffect(() => {
    function handleOnline() { setOnline(true); }
    function handleOffline() { setOnline(false); }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (online && fetchingCount === 0 && mutatingCount === 0) {
      const now = Date.now();
      setLastSyncedAt(now);
      try {
        localStorage.setItem("ironlog.lastSyncedAt", String(now));
      } catch {
        // ignore
      }
    }
  }, [online, fetchingCount, mutatingCount]);

  let label: string;
  let Icon = Cloud;
  let color = "text-emerald-400";
  let pulse = false;

  if (!online) {
    label = "Offline";
    Icon = CloudOff;
    color = "text-amber-400";
  } else if (fetchingCount + mutatingCount > 0) {
    label = "Syncing";
    Icon = RefreshCw;
    color = "text-sky-400";
    pulse = true;
  } else {
    label = "Synced";
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider",
        color,
      )}
      title={
        lastSyncedAt
          ? `Last synced ${formatRelative(lastSyncedAt)}`
          : "Not synced yet"
      }
    >
      <Icon size={12} className={pulse ? "animate-spin" : ""} strokeWidth={2.5} />
      {!compact && <span>{label}</span>}
    </div>
  );
}

function formatRelative(ts: number): string {
  const diffSec = Math.round((Date.now() - ts) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ts).toLocaleString();
}
