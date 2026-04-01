import { useState, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { format, startOfWeek, startOfMonth, subMonths, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  MoreVertical,
  Pencil,
  Trash2,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileImage,
  Fuel,
  DollarSign,
  BarChart3,
} from "lucide-react";
import {
  useExpenses,
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from "@/hooks/useExpenses";
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { FuelCardImportDialog } from "@/components/expenses/FuelCardImportDialog";
import { ExpenseEmailBanner } from "@/components/expenses/ExpenseEmailBanner";
import { SortableHeader } from "@/components/shared/table/SortableHeader";
import { TableSelectionBar } from "@/components/shared/table/TableSelectionBar";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableSelection } from "@/hooks/useTableSelection";
import { DateRangePicker } from "@/components/reports/DateRangePicker";
import { useDeleteExpense } from "@/hooks/useExpenses";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const categoryColors: Record<ExpenseCategory, string> = {
  materials: "bg-blue-500/10 text-blue-500",
  equipment: "bg-purple-500/10 text-purple-500",
  vehicle: "bg-orange-500/10 text-orange-500",
  fuel: "bg-red-500/10 text-red-500",
  tools: "bg-yellow-500/10 text-yellow-500",
  subcontractor: "bg-pink-500/10 text-pink-500",
  insurance: "bg-indigo-500/10 text-indigo-500",
  office: "bg-gray-500/10 text-gray-500",
  utilities: "bg-cyan-500/10 text-cyan-500",
  marketing: "bg-green-500/10 text-green-500",
  travel: "bg-teal-500/10 text-teal-500",
  meals: "bg-amber-500/10 text-amber-500",
  other: "bg-muted text-muted-foreground",
};

const chartColors = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220, 70%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(340, 65%, 55%)",
  "hsl(160, 60%, 45%)",
  "hsl(30, 70%, 55%)",
  "hsl(190, 60%, 50%)",
  "hsl(50, 70%, 50%)",
  "hsl(0, 0%, 55%)",
];

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fuelCardOpen, setFuelCardOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data: expenses, isLoading } = useExpenses();
  const deleteExpense = useDeleteExpense();
  const { formatCurrency } = useCurrency();

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    const query = searchQuery.toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch =
        expense.description.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "all" || expense.category === categoryFilter;
      const expDate = new Date(expense.expense_date);
      const matchesDateRange =
        !dateRange?.from ||
        isWithinInterval(expDate, {
          start: dateRange.from,
          end: dateRange.to || dateRange.from,
        });
      return matchesSearch && matchesCategory && matchesDateRange;
    });
  }, [expenses, searchQuery, categoryFilter, dateRange]);

  // Sort & selection
  const { sortedData, handleSort, getSortDirection } =
    useTableSort<Expense>(filteredExpenses);
  const {
    selectedRows,
    allSelected,
    someSelected,
    handleSelectAll,
    handleCheckboxChange,
    clearSelection,
  } = useTableSelection(sortedData.length);

  // Stats
  const stats = useMemo(() => {
    if (!expenses)
      return {
        thisMonth: 0,
        lastMonth: 0,
        thisWeek: 0,
        avg: 0,
        topCategory: null as { name: string; amount: number } | null,
        byCategory: [] as { name: string; value: number }[],
      };

    const now = new Date();
    const monthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = new Date(monthStart.getTime() - 1);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });

    let thisMonth = 0;
    let lastMonth = 0;
    let thisWeek = 0;
    const catMap: Record<string, number> = {};

    // Use filtered or all expenses for stats based on whether filters are active
    const statsSource = filteredExpenses.length > 0 || searchQuery || categoryFilter !== "all" || dateRange ? filteredExpenses : expenses;

    statsSource.forEach((e) => {
      const d = new Date(e.expense_date);
      const amt = Number(e.amount);
      if (d >= monthStart) thisMonth += amt;
      if (d >= lastMonthStart && d <= lastMonthEnd) lastMonth += amt;
      if (d >= weekStart) thisWeek += amt;
      const label =
        EXPENSE_CATEGORIES.find((c) => c.value === e.category)?.label ||
        e.category;
      catMap[label] = (catMap[label] || 0) + amt;
    });

    const byCategory = Object.entries(catMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return {
      thisMonth,
      lastMonth,
      thisWeek,
      avg: statsSource.length > 0 ? statsSource.reduce((s, e) => s + Number(e.amount), 0) / statsSource.length : 0,
      topCategory: byCategory[0] || null,
      byCategory,
    };
  }, [expenses, filteredExpenses, searchQuery, categoryFilter, dateRange]);

  const momChange =
    stats.lastMonth > 0
      ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
      : 0;

  const getCategoryLabel = (category: ExpenseCategory) =>
    EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;

  const handleEdit = (expense: Expense) => {
    setSelectedExpense(expense);
    setFormOpen(true);
  };

  const handleDelete = (expense: Expense) => {
    setSelectedExpense(expense);
    setDeleteOpen(true);
  };

  const handleNewExpense = () => {
    setSelectedExpense(null);
    setFormOpen(true);
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedRows).map((i) => sortedData[i]?.id).filter(Boolean);
    ids.forEach((id) => deleteExpense.mutate(id));
    clearSelection();
  };

  const handleExport = () => {
    const rows = selectedRows.size > 0
      ? Array.from(selectedRows).map((i) => sortedData[i])
      : sortedData;
    const csv = [
      ["Date", "Description", "Vendor", "Category", "Job", "Amount"].join(","),
      ...rows.map((e) =>
        [
          e.expense_date,
          `"${e.description}"`,
          `"${e.vendor || ""}"`,
          e.category,
          `"${e.jobs?.title || ""}"`,
          e.amount,
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-[28px] font-bold tracking-[-0.02em]">
            Expenses
          </h1>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => setFuelCardOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Fuel className="mr-1 sm:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Import Fuel Card</span>
              <span className="sm:hidden">Fuel</span>
            </Button>
            <Button onClick={handleNewExpense} className="flex-1 sm:flex-none">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        <ExpenseEmailBanner />

        {/* Stats Strip */}
        <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-hide">
          {/* This Month */}
          <Card className="min-w-[160px] snap-start shrink-0 flex-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    This Month
                  </p>
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-bold truncate">
                      {formatCurrency(stats.thisMonth)}
                    </p>
                    
                    {momChange !== 0 && (
                      <span
                        className={`text-[10px] flex items-center ${momChange > 0 ? "text-destructive" : "text-green-600"}`}
                      >
                        {momChange > 0 ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(momChange).toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="min-w-[140px] snap-start shrink-0 flex-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    This Week
                  </p>
                  <p className="text-sm font-bold truncate">
                    {formatCurrency(stats.thisWeek)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average */}
          <Card className="min-w-[140px] snap-start shrink-0 flex-1">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Average
                  </p>
                  <p className="text-sm font-bold truncate">
                    {formatCurrency(stats.avg)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Category */}
          {stats.topCategory && (
            <Card className="min-w-[150px] snap-start shrink-0 flex-1">
              <CardContent className="p-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                    <Receipt className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      Top Category
                    </p>
                    <p className="text-sm font-bold truncate">
                      {stats.topCategory.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Category Breakdown Chart */}
        {stats.byCategory.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Spend by Category
              </p>
              <div className="h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={stats.byCategory.slice(0, 8)}
                    layout="vertical"
                    margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={90}
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid hsl(var(--border))",
                        background: "hsl(var(--popover))",
                        color: "hsl(var(--popover-foreground))",
                      }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
                      {stats.byCategory.slice(0, 8).map((_, i) => (
                        <Cell key={i} fill={chartColors[i % chartColors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EXPENSE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
        </div>

        {/* Selection Bar */}
        <TableSelectionBar
          selectedCount={selectedRows.size}
          onClear={clearSelection}
          onExport={handleExport}
          onBulkDelete={handleBulkDelete}
        />

        {/* Dense Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : sortedData.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Receipt}
                  title={
                    searchQuery || categoryFilter !== "all" || dateRange
                      ? "No expenses match your filters"
                      : "Track every business expense"
                  }
                  description={
                    searchQuery || categoryFilter !== "all" || dateRange
                      ? "Try a different search term, category, or date range."
                      : "Log expenses, snap receipt photos, and import fuel card statements — so tax time is painless."
                  }
                  actionLabel={
                    !searchQuery && categoryFilter === "all" && !dateRange
                      ? "Add Your First Expense"
                      : undefined
                  }
                  onAction={
                    !searchQuery && categoryFilter === "all" && !dateRange
                      ? handleNewExpense
                      : undefined
                  }
                />
              </div>
            ) : (
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="h-8 px-2 w-8 bg-muted/60">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={handleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                    </th>
                    <SortableHeader
                      sortDirection={getSortDirection("expense_date")}
                      onSort={() => handleSort("expense_date")}
                      className="w-[90px]"
                    >
                      DATE
                    </SortableHeader>
                    <SortableHeader
                      sortDirection={getSortDirection("description")}
                      onSort={() => handleSort("description")}
                    >
                      DESCRIPTION
                    </SortableHeader>
                    <SortableHeader
                      sortDirection={getSortDirection("vendor")}
                      onSort={() => handleSort("vendor")}
                      className="hidden md:table-cell"
                    >
                      VENDOR
                    </SortableHeader>
                    <SortableHeader
                      sortDirection={getSortDirection("category")}
                      onSort={() => handleSort("category")}
                    >
                      CATEGORY
                    </SortableHeader>
                    <th className="h-8 px-3 py-2 text-[10px] font-semibold text-foreground/80 bg-muted/60 uppercase tracking-wide hidden lg:table-cell">
                      JOB
                    </th>
                    <th className="h-8 px-2 w-8 bg-muted/60 hidden sm:table-cell text-center">
                      <FileImage className="h-3 w-3 mx-auto text-muted-foreground" />
                    </th>
                    <SortableHeader
                      sortDirection={getSortDirection("amount")}
                      onSort={() => handleSort("amount")}
                      align="right"
                      className="w-[100px]"
                    >
                      AMOUNT
                    </SortableHeader>
                    <th className="h-8 px-2 w-8 bg-muted/60" />
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((expense, idx) => (
                    <tr
                      key={expense.id}
                      className={`border-b border-border/50 last:border-0 hover:bg-muted/40 transition-colors cursor-pointer ${selectedRows.has(idx) ? "bg-primary/5" : ""}`}
                      onClick={() => handleEdit(expense)}
                    >
                      <td
                        className="px-2 py-0.5 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={selectedRows.has(idx)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(idx, checked)
                          }
                          className="h-3.5 w-3.5"
                        />
                      </td>
                      <td className="px-3 py-0.5 text-muted-foreground whitespace-nowrap">
                        {format(new Date(expense.expense_date), "dd MMM yy")}
                      </td>
                      <td className="px-3 py-0.5 font-medium truncate max-w-[200px]">
                        {expense.description}
                      </td>
                      <td className="px-3 py-0.5 text-muted-foreground truncate max-w-[120px] hidden md:table-cell">
                        {expense.vendor || "—"}
                      </td>
                      <td className="px-3 py-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] px-1.5 py-0 ${categoryColors[expense.category]}`}
                        >
                          {getCategoryLabel(expense.category)}
                        </Badge>
                      </td>
                      <td className="px-3 py-0.5 text-muted-foreground truncate max-w-[120px] hidden lg:table-cell">
                        {expense.jobs?.title || "—"}
                      </td>
                      <td className="px-2 py-0.5 text-center hidden sm:table-cell">
                        {expense.receipt_url ? (
                          <FileImage className="h-3 w-3 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                      <td className="px-3 py-0.5 text-right font-semibold whitespace-nowrap">
                        <span className="tabular-nums">{formatCurrency(Number(expense.amount))}</span>
                      </td>
                      <td
                        className="px-1 py-0.5 w-8"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(expense)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Row count */}
        {!isLoading && sortedData.length > 0 && (
          <p className="text-[11px] text-muted-foreground text-right">
            Showing {sortedData.length} of {expenses?.length || 0} expenses
          </p>
        )}
      </div>

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={selectedExpense}
      />

      <DeleteExpenseDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        expense={selectedExpense}
      />

      <FuelCardImportDialog
        open={fuelCardOpen}
        onOpenChange={setFuelCardOpen}
      />
    </DashboardLayout>
  );
}
