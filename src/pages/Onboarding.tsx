import { Navigate } from "react-router-dom";

// Onboarding is now handled as a modal within the Dashboard.
// Redirect any direct visits to /onboarding to the dashboard.
export default function Onboarding() {
  return <Navigate to="/dashboard" replace />;
}
