import { Eye, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRolePreview } from "@/contexts/RolePreviewContext";

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  ceo: "Owner (CEO)",
  manager: "Manager",
  member: "Team Member",
};

/**
 * Sticky top banner shown when an admin is previewing the UI as another role.
 * Lets them exit the preview with one click.
 */
export function RolePreviewBanner() {
  const { previewRole, setPreviewRole, isPreviewing } = useRolePreview();

  if (!isPreviewing || !previewRole) return null;

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-amber-950 border-b border-amber-600 shadow-sm">
      <div className="container mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Eye className="h-4 w-4 shrink-0" />
          <span className="font-medium truncate">
            Previewing as <strong>{ROLE_LABELS[previewRole] ?? previewRole}</strong>
          </span>
          <span className="hidden sm:inline opacity-75">
            · UI restrictions match this role. Your data is unchanged.
          </span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 hover:bg-amber-600/20 text-amber-950 shrink-0"
          onClick={() => setPreviewRole(null)}
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Exit preview
        </Button>
      </div>
    </div>
  );
}
