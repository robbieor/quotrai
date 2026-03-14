import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, LucideIcon } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

interface DraggableNavItemProps {
  id: string;
  title: string;
  url: string;
  icon: LucideIcon;
}

export function DraggableNavItem({ id, title, url, icon: Icon }: DraggableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <SidebarMenuItem ref={setNodeRef} style={style}>
      <SidebarMenuButton asChild>
        <NavLink
          to={url}
          end={url === "/dashboard"}
          className="group flex items-center gap-3 rounded-full border border-muted-foreground/50 px-3 py-2 text-foreground transition-all duration-300 ease-out hover:bg-muted hover:translate-x-1 [&>svg]:transition-transform [&>svg]:duration-300"
          activeClassName="bg-primary/20 text-foreground font-medium border-primary [&>svg]:scale-110"
        >
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100 transition-opacity -ml-1"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
