import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { apiRequest } from "../lib/api";

interface Organization {
    id: number;
    name: string;
    role: string;
}

interface UserProfile {
    businessName?: string;
    businessOwnerName?: string;
    businessNumber?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
    address2?: string;
    address3?: string;
    vatNumber?: string;
}

interface User {
    id: string;
    email: string;
    profile?: UserProfile;
    currentOrganization?: Organization | null;
    organizations?: Organization[];
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    currentOrganization: Organization | null;
    organizations: Organization[];
    userRole: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
    switchOrganization: (organizationId: number) => Promise<void>;
    hasPermission: (requiredRole: string) => boolean;
}

const roleHierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    staff: 2,
    viewer: 1,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const currentOrganization = user?.currentOrganization || null;
    const organizations = user?.organizations || [];
    const userRole = currentOrganization?.role || null;

    const refreshUser = async () => {
        try {
            const response = await apiRequest("GET", "/api/auth/me");
            if (response.ok) {
                const userData = await response.json();
                setUser(userData);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        }
    };

    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, []);

    const login = async (email: string, password: string) => {
        await apiRequest("POST", "/api/auth/login", { email, password });
        await refreshUser();
    };

    const register = async (email: string, password: string) => {
        await apiRequest("POST", "/api/auth/register", { email, password });
        await refreshUser();
    };

    const logout = async () => {
        await apiRequest("POST", "/api/auth/logout");
        setUser(null);
    };

    const switchOrganization = async (organizationId: number) => {
        const response = await apiRequest("POST", "/api/organizations/switch", { organizationId });
        if (response.ok) {
            await refreshUser();
        }
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
                isLoading,
                isAuthenticated: !!user,
                currentOrganization,
                organizations,
                userRole,
                login,
                register,
                logout,
                refreshUser,
                switchOrganization,
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
