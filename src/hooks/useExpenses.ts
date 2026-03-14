import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ExpenseCategory = 
  | "materials"
  | "equipment"
  | "vehicle"
  | "fuel"
  | "tools"
  | "subcontractor"
  | "insurance"
  | "office"
  | "utilities"
  | "marketing"
  | "travel"
  | "meals"
  | "other";

export interface Expense {
  id: string;
  team_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  vendor: string | null;
  receipt_url: string | null;
  notes: string | null;
  job_id: string | null;
  created_at: string;
  updated_at: string;
  jobs?: { title: string } | null;
}

export interface ExpenseInsert {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date?: string;
  vendor?: string | null;
  receipt_url?: string | null;
  notes?: string | null;
  job_id?: string | null;
}

export interface ExpenseUpdate extends Partial<ExpenseInsert> {
  id: string;
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: "materials", label: "Materials" },
  { value: "equipment", label: "Equipment" },
  { value: "vehicle", label: "Vehicle" },
  { value: "fuel", label: "Fuel" },
  { value: "tools", label: "Tools" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "insurance", label: "Insurance" },
  { value: "office", label: "Office" },
  { value: "utilities", label: "Utilities" },
  { value: "marketing", label: "Marketing" },
  { value: "travel", label: "Travel" },
  { value: "meals", label: "Meals" },
  { value: "other", label: "Other" },
];

export function useExpenses() {
  return useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*, jobs(title)")
        .order("expense_date", { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: ExpenseInsert) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const { data, error } = await supabase
        .from("expenses")
        .insert({ ...expense, team_id: teamId })
        .select("*, jobs(title)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create expense: " + error.message);
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate) => {
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select("*, jobs(title)")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update expense: " + error.message);
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete expense: " + error.message);
    },
  });
}

export function useUploadReceipt() {
  return useMutation({
    mutationFn: async (file: File) => {
      const { data: teamId, error: teamError } = await supabase.rpc("get_user_team_id");
      if (teamError) throw teamError;

      const fileExt = file.name.split(".").pop();
      const fileName = `${teamId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      return publicUrl;
    },
    onError: (error) => {
      toast.error("Failed to upload receipt: " + error.message);
    },
  });
}

export function useExpenseStats() {
  const { data: expenses } = useExpenses();

  const stats = {
    total: expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0,
    thisMonth: 0,
    byCategory: {} as Record<ExpenseCategory, number>,
  };

  if (expenses) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    expenses.forEach((expense) => {
      const expenseDate = new Date(expense.expense_date);
      if (expenseDate >= startOfMonth) {
        stats.thisMonth += Number(expense.amount);
      }
      
      stats.byCategory[expense.category] = (stats.byCategory[expense.category] || 0) + Number(expense.amount);
    });
  }

  return stats;
}
