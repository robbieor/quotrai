import { supabase } from "@/integrations/supabase/client";

export interface WebhookResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  errorCode?: string;
  errorMessage?: string;
}

const JWT_REFRESH_THRESHOLD_SECONDS = 60;

async function getFreshAccessToken(forceRefresh = false): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresAt = session.expires_at ?? 0;
  const secondsLeft = expiresAt - Math.floor(Date.now() / 1000);

  if (forceRefresh || secondsLeft < JWT_REFRESH_THRESHOLD_SECONDS) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data.session) return session.access_token;
    return data.session.access_token;
  }

  return session.access_token;
}

/**
 * Hardened webhook client for voice tool calls.
 * - Refreshes JWT if <60s left
 * - On 401, refreshes once and retries once
 * - Returns structured result for consistent error handling
 */
export async function callVoiceWebhook<T = unknown>(
  functionName: string,
  body: Record<string, unknown> = {}
): Promise<WebhookResult<T>> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const url = `${supabaseUrl}/functions/v1/${functionName}`;

  const send = async (token: string | null) => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: anonKey,
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    let data: unknown = null;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { res, data };
  };

  try {
    const token = await getFreshAccessToken();
    let { res, data } = await send(token);

    // 401 → refresh once and retry once
    if (res.status === 401) {
      const refreshed = await getFreshAccessToken(true);
      ({ res, data } = await send(refreshed));
    }

    if (!res.ok) {
      const dataObj = (data as Record<string, unknown>) || {};
      return {
        ok: false,
        status: res.status,
        data: data as T,
        errorCode: (dataObj.code as string) || `http_${res.status}`,
        errorMessage: (dataObj.error as string) || (dataObj.message as string) || res.statusText,
      };
    }

    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      errorCode: "network_error",
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}
