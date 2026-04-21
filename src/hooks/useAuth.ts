import { useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fire welcome email on first verified sign-in (self-signup flow only).
        // Skip if this is an invited user — AcceptInvite.tsx handles that variant.
        if (event === "SIGNED_IN" && session?.user) {
          const u = session.user;
          const verified = !!(u.email_confirmed_at || u.confirmed_at);
          const inviteToken = sessionStorage.getItem("pending_invite_token");
          const sentKey = `welcome_sent_${u.id}`;
          if (verified && !inviteToken && !localStorage.getItem(sentKey)) {
            // Mark immediately to prevent double-fire from rapid auth events
            localStorage.setItem(sentKey, "1");
            const fullName =
              (u.user_metadata as any)?.full_name ||
              (u.user_metadata as any)?.name ||
              null;
            // Defer to avoid blocking auth state callback
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
                  // Roll back the marker so a retry can happen on next sign-in
                  localStorage.removeItem(sentKey);
                  console.warn("Welcome email send failed", err);
                });
            }, 0);
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

    return () => subscription.unsubscribe();
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
