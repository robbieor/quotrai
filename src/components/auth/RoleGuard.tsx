import { Navigate } from "react-router-dom";
import { useUserRole, TEAM_SEAT_ALLOWED_ROUTES } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";

interface RoleGuardProps {
  children: React.ReactNode;
}

/**
 * Redirects Team Seat (member) users to /jobs if they try to access
 * pages they don't have access to (Dashboard, Quotes, Invoices, etc.)
 */
export function RoleGuard({ children }: RoleGuardProps) {
  const { user } = useAuth();
  const { isTeamSeat, isLoading } = useUserRole();

  // Don't guard if not logged in or still loading role
  if (!user || isLoading) return <>{children}</>;

  if (isTeamSeat) {
    const currentPath = window.location.pathname;
    const isAllowed = TEAM_SEAT_ALLOWED_ROUTES.some(
      (route) => currentPath === route || currentPath.startsWith(route + "/")
    );

    if (!isAllowed) {
      return <Navigate to="/jobs" replace />;
    }
  }

  return <>{children}</>;
}
