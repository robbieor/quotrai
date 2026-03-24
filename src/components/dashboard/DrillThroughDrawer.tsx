import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
                  {linkPrefix && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.slice(0, 50).map((row, i) => (
                  <TableRow key={row.id || i}>
                    {columns.map((col) => (
                      <TableCell key={col.key} className={`text-sm py-2 ${col.align === "right" ? "text-right tabular-nums font-medium" : ""}`}>
                        {col.format ? col.format(row[col.key]) : row[col.key]}
                      </TableCell>
                    ))}
                    {linkPrefix && (
                      <TableCell className="py-2">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(`${linkPrefix}?highlight=${row.id}`)}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    )}
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
