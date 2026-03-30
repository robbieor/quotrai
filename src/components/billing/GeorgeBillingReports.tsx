import { BarChart3, TrendingUp, Calendar, Receipt } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeorgeUsageHistory } from "@/hooks/useGeorgeUsageHistory";
import { format } from "date-fns";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useIsNative } from "@/hooks/useIsNative";

// Voice is included in seat price — cost shown per seat based on actual tier pricing
// Lite: €19, Connect: €39, Grow: €69
const SEAT_PRICES = { lite: 19, connect: 39, grow: 69 } as const;
const DEFAULT_SEAT_PRICE = 39; // fallback to Connect pricing

export function GeorgeBillingReports() {
  const { data: snapshots, isLoading } = useGeorgeUsageHistory();
  const isNative = useIsNative();

  if (isNative) return null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Foreman AI Voice Billing History
          </CardTitle>
          <CardDescription>
            Monthly usage and cost breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No billing history yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Usage data will appear here after your first billing cycle
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data (reversed for chronological order)
  const chartData = [...snapshots].reverse().map((snapshot) => ({
    month: format(new Date(snapshot.period_end), "MMM yy"),
    minutes: Math.round(snapshot.minutes_used),
    cost: snapshot.george_voice_seats * DEFAULT_SEAT_PRICE,
    seats: snapshot.george_voice_seats,
  }));

  // Calculate totals
  const totalMinutes = snapshots.reduce((sum, s) => sum + s.minutes_used, 0);
  const totalCost = snapshots.reduce((sum, s) => sum + (s.george_voice_seats * DEFAULT_SEAT_PRICE), 0);
  const avgMonthlyMinutes = snapshots.length > 0 ? totalMinutes / snapshots.length : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Voice Minutes</CardDescription>
            <CardTitle className="text-2xl">{Math.round(totalMinutes)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Across {snapshots.length} month{snapshots.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Monthly Usage</CardDescription>
            <CardTitle className="text-2xl flex items-center gap-2">
              {Math.round(avgMonthlyMinutes)} mins
              <TrendingUp className="h-4 w-4 text-primary" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Per billing cycle
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Voice Cost</CardDescription>
            <CardTitle className="text-2xl">€{totalCost.toFixed(2)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Foreman AI Voice add-on charges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Usage Trend
          </CardTitle>
          <CardDescription>
            Monthly voice minutes consumption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs fill-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--popover-foreground))',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'minutes' ? `${value} mins` : `€${value}`,
                    name === 'minutes' ? 'Voice Minutes' : 'Cost'
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="minutes"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorMinutes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Billing History
          </CardTitle>
          <CardDescription>
            Detailed monthly breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Voice Seats</TableHead>
                <TableHead className="text-right">Minutes Used</TableHead>
                <TableHead className="text-right">Minutes Limit</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const usagePercent = snapshot.minutes_limit > 0 
                  ? (snapshot.minutes_used / snapshot.minutes_limit) * 100 
                  : 0;
                const cost = snapshot.george_voice_seats * TOM_VOICE_PRICE;

                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">
                      {format(new Date(snapshot.period_end), "MMMM yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      {snapshot.george_voice_seats}
                    </TableCell>
                    <TableCell className="text-right">
                      {Math.round(snapshot.minutes_used)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {snapshot.minutes_limit}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={usagePercent >= 90 ? "destructive" : usagePercent >= 70 ? "secondary" : "outline"}
                      >
                        {Math.round(usagePercent)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      €{cost.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
