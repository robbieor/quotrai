import { Eye } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRolePreview } from "@/contexts/RolePreviewContext";
import { useUserRole, type TeamRole } from "@/hooks/useUserRole";

/**
 * Owner-only control to preview the UI as another role (Manager / Team Member).
 * Lives in Settings → Team. Does NOT change data — purely a UI gate flip.
 */
export function RolePreviewControl() {
  const { realRole } = useUserRole();
  const { previewRole, setPreviewRole, isPreviewing } = useRolePreview();

  // Only owners/CEOs see this card
  if (realRole !== "owner" && realRole !== "ceo") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-4 w-4" />
          Preview as another role
        </CardTitle>
        <CardDescription>
          Check exactly what your team members see. The menus, buttons, and pages
          will hide/show as if you were that role. Your data stays the same.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <Select
          value={previewRole ?? "off"}
          onValueChange={(v) => setPreviewRole(v === "off" ? null : (v as TeamRole))}
        >
          <SelectTrigger className="w-full sm:w-[240px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="off">Normal view (Owner)</SelectItem>
            <SelectItem value="manager">Preview as Manager</SelectItem>
            <SelectItem value="member">Preview as Team Member</SelectItem>
          </SelectContent>
        </Select>
        {isPreviewing && (
          <Button variant="outline" size="sm" onClick={() => setPreviewRole(null)}>
            Exit preview
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
