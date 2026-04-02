import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface DrillColumn {
  key: string;
  label: string;
  align?: "left" | "right";
  format?: (value: any) => string;
}

interface DrillThroughDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: DrillColumn[];
  data: any[];
  linkPrefix?: string;
}

export function DrillThroughDrawer({ open, onOpenChange, title, columns, data, linkPrefix }: DrillThroughDrawerProps) {
  const navigate = useNavigate();

  const handleRowClick = (row: any) => {
    if (linkPrefix && row.id) {
      onOpenChange(false);
      navigate(`${linkPrefix}?highlight=${row.id}`);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-base">{title} ({data.length})</SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          {data.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No records found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col.key} className={`text-xs ${col.align === "right" ? "text-right" : ""}`}>
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 50).map((row, i) => (
                  <TableRow
                    key={row.id || i}
                    className={cn(linkPrefix && "cursor-pointer hover:bg-primary/5")}
                    onClick={() => handleRowClick(row)}
                  >
                    {columns.map((col) => (
                      <TableCell key={col.key} className={`text-sm py-2 ${col.align === "right" ? "text-right tabular-nums font-medium" : ""}`}>
                        {col.format ? col.format(row[col.key]) : row[col.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
