import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
    id: string;
    email: string | null;
    full_name: string | null;
    company_name: string | null;
    phone: string | null;
    team_id: string | null;
    avatar_url: string | null;
    trade_type: string | null;
    country: string | null;
    currency: string;
    onboarding_completed: boolean;
}


interface AuthContextType {
    user: SupabaseUser | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    teamId: string | null;
    userRole: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    hasPermission: (requiredRole: string) => boolean;
}

const roleHierarchy: Record<string, number> = {
    owner: 4,
    manager: 3,
    member: 2,
    viewer: 1,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<SupabaseUser | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const teamId = profile?.team_id || null;

    const fetchProfile = async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        
        if (data) {
            setProfile(data as Profile);
        }

        // Get team role
        const { data: membership } = await supabase
            .from("team_memberships")
            .select("role")
            .eq("user_id", userId)
            .limit(1)
            .single();
        
        if (membership) {
            setUserRole(membership.role);
        }
    };

    const refreshUser = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        setUser(currentUser);
        if (currentUser) {
            await fetchProfile(currentUser.id);
        } else {
            setProfile(null);
            setUserRole(null);
        }
    };

    useEffect(() => {
        // Set up auth state listener BEFORE checking session
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                const currentUser = session?.user ?? null;
                setUser(currentUser);
                
                if (currentUser) {
                    // Use setTimeout to avoid deadlock with Supabase auth
                    setTimeout(() => fetchProfile(currentUser.id), 0);
                } else {
                    setProfile(null);
                    setUserRole(null);
                }

                if (event === "INITIAL_SESSION") {
                    setIsLoading(false);
                }
            }
        );

        // Check existing session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            if (currentUser) {
                fetchProfile(currentUser.id).finally(() => setIsLoading(false));
            } else {
                setIsLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const login = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
    };

    const register = async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw new Error(error.message);
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setUserRole(null);
    };

    const hasPermission = (requiredRole: string): boolean => {
        if (!userRole) return false;
        const userLevel = roleHierarchy[userRole] || 0;
        const requiredLevel = roleHierarchy[requiredRole] || 0;
        return userLevel >= requiredLevel;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                isLoading,
                isAuthenticated: !!user,
                teamId,
                userRole,
                login,
                register,
                logout,
                refreshUser,
                hasPermission,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
