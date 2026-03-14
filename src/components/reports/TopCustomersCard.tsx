import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TopCustomer } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

interface TopCustomersCardProps {
  data: TopCustomer[];
  isLoading: boolean;
}

export function TopCustomersCard({ data, isLoading }: TopCustomersCardProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Top Customers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/customers")}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Top Customers</CardTitle>
          <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">No customer data available</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="cursor-pointer group hover:border-primary/40 transition-colors" onClick={() => navigate("/customers")}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Top Customers</CardTitle>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((customer, index) => (
            <div
              key={customer.name}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-sm">
                  {index + 1}
                </span>
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">{customer.jobs} jobs</p>
                </div>
              </div>
              <span className="font-semibold">${customer.revenue.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
