import { useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CLIENT_SESSION_KEY = "revamo_client_session_id";

function getOrCreateClientSessionId(): string {
  try {
    let id = localStorage.getItem(CLIENT_SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(CLIENT_SESSION_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const trackedRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fire welcome email on first verified sign-in (self-signup flow only).
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          const verified = !!(u.email_confirmed_at || u.confirmed_at);
          const inviteToken = sessionStorage.getItem("pending_invite_token");
          const sentKey = `welcome_sent_${u.id}`;
          if (verified && !inviteToken && !localStorage.getItem(sentKey)) {
            localStorage.setItem(sentKey, "1");
            const fullName =
              (u.user_metadata as any)?.full_name ||
              (u.user_metadata as any)?.name ||
              null;
            setTimeout(() => {
              supabase.functions
                .invoke("send-transactional-email", {
                  body: {
                    templateName: "welcome",
                    recipientEmail: u.email,
                    idempotencyKey: `welcome-${u.id}`,
                    templateData: {
                      variant: "self_signup",
                      name: fullName,
                    },
                  },
                })
                .catch((err) => {
                  localStorage.removeItem(sentKey);
                  console.warn("Welcome email send failed", err);
                });
            }, 0);
          }

          // Track session (concurrent-session detection). Once per user.
          if (trackedRef.current !== u.id) {
            trackedRef.current = u.id;
            const clientSessionId = getOrCreateClientSessionId();
            setTimeout(() => {
              supabase.functions
                .invoke("track-session", { body: { clientSessionId } })
                .catch((err) => console.warn("track-session failed", err));
            }, 0);

            // Subscribe to realtime revocation of this session
            if (realtimeChannelRef.current) {
              try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
              realtimeChannelRef.current = null;
            }
            const channel = supabase
              .channel(`auth-sessions-${u.id}`)
              .on(
                "postgres_changes",
                {
                  event: "UPDATE",
                  schema: "public",
                  table: "auth_sessions",
                  filter: `user_id=eq.${u.id}`,
                },
                (payload) => {
                  const row: any = payload.new;
                  if (
                    row?.client_session_id === clientSessionId &&
                    row?.revoked_at
                  ) {
                    toast.error(
                      "You've been signed out because this account just signed in on another device."
                    );
                    supabase.auth.signOut();
                  }
                }
              )
              .subscribe();
            realtimeChannelRef.current = channel;
          }
        }

        if (event === "SIGNED_OUT") {
          trackedRef.current = null;
          if (realtimeChannelRef.current) {
            try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
            realtimeChannelRef.current = null;
          }
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (realtimeChannelRef.current) {
        try { supabase.removeChannel(realtimeChannelRef.current); } catch {}
        realtimeChannelRef.current = null;
      }
    };
  }, []);

  const signUp = async (email: string, password: string, fullName?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: fullName,
        },
      },
    });
    return { data, error };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
  };
}
