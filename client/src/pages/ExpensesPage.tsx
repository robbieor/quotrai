import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Receipt, Calendar, X } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(num || 0);
};
const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });

export default function ExpensesPage() {
    const queryClient = useQueryClient();
    const { teamId, user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("0");
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
    const [category, setCategory] = useState<"materials" | "tools" | "fuel" | "subcontractor" | "office" | "insurance" | "other">("other");
    const [vendor, setVendor] = useState("");

    const { data: expenses = [], isLoading } = useQuery({
        queryKey: ["expenses", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase.from("expenses").select("*").eq("team_id", teamId).order("expense_date", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const { error } = await supabase.from("expenses").insert({
                team_id: teamId!, description: data.description, amount: data.amount,
                expense_date: data.date, category: data.category, vendor: data.vendor || null,
                created_by: user?.id,
            });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["expenses"] }); closeModal(); },
    });

    const closeModal = () => { setShowCreateModal(false); setDescription(""); setAmount("0"); setDate(new Date().toISOString().split("T")[0]); setCategory("other"); setVendor(""); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!description.trim() || !amount) return;
        createMutation.mutate({ description, amount: parseFloat(amount) || 0, date, category, vendor });
    };

    const filteredExpenses = expenses.filter((exp: any) =>
        exp.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalExpenses = expenses.reduce((sum: number, exp: any) => sum + (parseFloat(exp.amount) || 0), 0);

    const columns: Column<any>[] = [
        { key: "description", header: "Description", render: (row) => (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 32, height: 32, borderRadius: "8px", background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center" }}><Receipt size={16} color="#f59e0b" /></div>
                <span style={{ fontWeight: 500 }}>{row.description}</span>
            </div>
        ), sortable: true },
        { key: "category", header: "Category", render: (row) => <span className={styles.statusBadge} style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>{row.category || "other"}</span>, sortable: true, width: "130px" },
        { key: "amount", header: "Amount", render: (row) => <strong style={{ color: "#ef4444" }}>{formatCurrency(row.amount)}</strong>, sortable: true, width: "120px" },
        { key: "expense_date", header: "Date", render: (row) => <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}><Calendar size={14} />{formatDate(row.expense_date)}</div>, sortable: true, width: "130px" },
        { key: "vendor", header: "Vendor", render: (row) => row.vendor || "—", sortable: true, width: "150px" },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div><h1 className={styles.title}>Expenses</h1><p className={styles.subtitle}>Track business expenses and receipts</p></div>
                <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}><Plus size={20} /> Add Expense</button>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Search expenses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
                <div className={styles.stats}><span className={styles.stat}><strong>{expenses.length}</strong> Expenses</span><span className={styles.stat}><strong>{formatCurrency(totalExpenses)}</strong> Total</span></div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading expenses...</div> : <DataTable columns={columns} data={filteredExpenses} emptyMessage="No expenses yet. Add your first expense!" />}

            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}><h2>Add New Expense</h2><button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button></div>
                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formGroup}><label className={styles.label}>Description *</label><input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className={styles.input} required placeholder="e.g. New Drill Bits" /></div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.label}>Amount (€) *</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={styles.input} required step="0.01" /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} required /></div>
                            </div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.label}>Category</label><select value={category} onChange={(e) => setCategory(e.target.value as any)} className={styles.input}><option value="other">Other</option><option value="tools">Tools</option><option value="fuel">Fuel</option><option value="materials">Materials</option><option value="office">Office</option><option value="subcontractor">Subcontractor</option><option value="insurance">Insurance</option></select></div>
                                <div className={styles.formGroup}><label className={styles.label}>Vendor</label><input type="text" value={vendor} onChange={(e) => setVendor(e.target.value)} className={styles.input} placeholder="e.g. Woodies" /></div>
                            </div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!description.trim() || !amount || createMutation.isPending}>{createMutation.isPending ? "Adding..." : "Add Expense"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
