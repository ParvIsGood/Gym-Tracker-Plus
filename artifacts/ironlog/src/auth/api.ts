import type { AuthResponse } from "@workspace/api-client-react";

class HttpError extends Error {
  status: number;
  data: unknown;
  constructor(status: number, data: unknown, message: string) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(body),
  });
  let parsed: unknown = null;
  try {
    parsed = await res.json();
  } catch {
    // ignore — body may be empty
  }
  if (!res.ok) {
    const msg =
      (parsed && typeof parsed === "object" && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : null) ?? `HTTP ${res.status}`;
    throw new HttpError(res.status, parsed, msg);
  }
  return parsed as T;
}

export async function signupRequest(body: {
  username: string;
  password: string;
  displayName?: string;
  migrateGuestId?: string;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/signup", body);
}

export async function loginRequest(body: {
  username: string;
  password: string;
}): Promise<AuthResponse> {
  return postJson<AuthResponse>("/api/auth/login", body);
}
