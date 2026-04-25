import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const USER_TOKEN_KEY = "ironlog.userToken";
const GUEST_ID_KEY = "ironlog.guestId";
const ONBOARDED_KEY = "ironlog.onboarded";

function readUserToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_TOKEN_KEY);
}

function getOrCreateGuestId(): string {
  if (typeof window === "undefined") {
    return "00000000-0000-0000-0000-000000000000";
  }
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getActiveToken(): string {
  const userToken = readUserToken();
  if (userToken) return `user:${userToken}`;
  return `guest:${getOrCreateGuestId()}`;
}

export function getGuestId(): string {
  return getOrCreateGuestId();
}

export function hasUserToken(): boolean {
  return readUserToken() !== null;
}

export function markOnboarded() {
  if (typeof window !== "undefined") {
    localStorage.setItem(ONBOARDED_KEY, "1");
  }
}

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(ONBOARDED_KEY) === "1";
}

setAuthTokenGetter(() => getActiveToken());

type AuthContextValue = {
  isAuthenticated: boolean;
  isGuest: boolean;
  setUserToken: (token: string) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => readUserToken());

  // Sync changes to localStorage from other tabs.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === USER_TOKEN_KEY) {
        setToken(e.newValue);
        queryClient.clear();
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: token !== null,
      isGuest: token === null,
      setUserToken(t: string) {
        localStorage.setItem(USER_TOKEN_KEY, t);
        setToken(t);
        queryClient.clear();
      },
      clearSession() {
        localStorage.removeItem(USER_TOKEN_KEY);
        localStorage.removeItem(ONBOARDED_KEY);
        // Generate a fresh guest id so logged-out state starts clean.
        localStorage.removeItem(GUEST_ID_KEY);
        setToken(null);
        queryClient.clear();
      },
    }),
    [token, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
