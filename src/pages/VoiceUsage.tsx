import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VoiceUsageDashboard } from "@/components/george/VoiceUsageDashboard";
import { VoiceDiagnostics } from "@/components/settings/VoiceDiagnostics";

export default function VoiceUsage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-2">
          <h1 className="text-2xl font-bold">Voice Usage & Billing</h1>
          <p className="text-muted-foreground text-sm">
            Track your revamo AI voice minutes, purchase history, and top up when needed.
          </p>
          <div className="pt-4 space-y-6">
            <VoiceDiagnostics />
            <VoiceUsageDashboard />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}
