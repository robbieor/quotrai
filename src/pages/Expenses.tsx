import { useState, useMemo } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { format } from "date-fns";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Calendar,
  FileImage,
  Fuel
} from "lucide-react";
import { 
  useExpenses, 
  useExpenseStats,
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory
} from "@/hooks/useExpenses";
import { ExpenseFormDialog } from "@/components/expenses/ExpenseFormDialog";
import { EmptyState } from "@/components/shared/EmptyState";
import { DeleteExpenseDialog } from "@/components/expenses/DeleteExpenseDialog";
import { FuelCardImportDialog } from "@/components/expenses/FuelCardImportDialog";
import { ExpenseEmailBanner } from "@/components/expenses/ExpenseEmailBanner";

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

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fuelCardOpen, setFuelCardOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const { data: expenses, isLoading } = useExpenses();
  const stats = useExpenseStats();

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    const query = searchQuery.toLowerCase();
    return expenses.filter((expense) => {
      const matchesSearch = 
        expense.description.toLowerCase().includes(query) ||
        expense.vendor?.toLowerCase().includes(query);
      const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const { formatCurrency } = useCurrency();

  const getCategoryLabel = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label || category;
  };

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

  return (
    <DashboardLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-sm md:text-base text-muted-foreground">Track and manage business expenses</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button variant="outline" onClick={() => setFuelCardOpen(true)} className="flex-1 sm:flex-none">
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

        {/* Email-to-Expense Banner */}
        <ExpenseEmailBanner />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Total</p>
                  <p className="text-lg md:text-2xl font-bold truncate">{formatCurrency(stats.total)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">This Month</p>
                  <p className="text-lg md:text-2xl font-bold truncate">{formatCurrency(stats.thisMonth)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1 lg:col-span-1">
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">Count</p>
                  <p className="text-lg md:text-2xl font-bold">{expenses?.length || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
        </div>

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-lg" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredExpenses.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title={searchQuery || categoryFilter !== "all" ? "No expenses match your filters" : "Track every business expense"}
                description={searchQuery || categoryFilter !== "all" ? "Try a different search term or category." : "Log expenses, snap receipt photos, and import fuel card statements — so tax time is painless."}
                actionLabel={!searchQuery && categoryFilter === "all" ? "Add Your First Expense" : undefined}
                onAction={!searchQuery && categoryFilter === "all" ? handleNewExpense : undefined}
              />
            ) : (
              <div className="space-y-1">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between py-3 md:py-4 border-b border-border last:border-0 hover:bg-muted/50 -mx-4 px-4 transition-colors gap-2 sm:gap-4"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <Receipt className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm md:text-base truncate">{expense.description}</p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {expense.vendor && `${expense.vendor} • `}
                          {format(new Date(expense.expense_date), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 pl-12 sm:pl-0">
                      {expense.receipt_url && (
                        <FileImage className="h-4 w-4 text-muted-foreground hidden sm:block" />
                      )}
                      <Badge className={categoryColors[expense.category]}>
                        {getCategoryLabel(expense.category)}
                      </Badge>
                      <span className="font-semibold text-sm md:text-base w-20 md:w-24 text-right">
                        {formatCurrency(Number(expense.amount))}
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
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
