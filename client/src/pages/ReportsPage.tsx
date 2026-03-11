import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, FileText, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount);

export default function ReportsPage() {
    const { teamId } = useAuth();

    const { data: invoices = [], isLoading: invLoading } = useQuery({
        queryKey: ["reports-invoices", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase.from("invoices").select("*").eq("team_id", teamId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const { data: expenses = [] } = useQuery({
        queryKey: ["reports-expenses", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase.from("expenses").select("*").eq("team_id", teamId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const { data: customers = [] } = useQuery({
        queryKey: ["reports-customers", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase.from("customers").select("id").eq("team_id", teamId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const startOfYear = new Date(now.getFullYear(), 0, 1).toISOString();

    const paidInvoices = invoices.filter((i: any) => i.status === "paid");
    const monthlyRevenue = paidInvoices.filter((i: any) => i.issue_date >= startOfMonth.split("T")[0]).reduce((s: number, i: any) => s + parseFloat(i.total || "0"), 0);
    const ytdRevenue = paidInvoices.filter((i: any) => i.issue_date >= startOfYear.split("T")[0]).reduce((s: number, i: any) => s + parseFloat(i.total || "0"), 0);
    const outstandingTotal = invoices.filter((i: any) => i.status === "sent" || i.status === "overdue").reduce((s: number, i: any) => s + parseFloat(i.total || "0"), 0);
    const monthlyExpenses = expenses.filter((e: any) => e.expense_date >= startOfMonth.split("T")[0]).reduce((s: number, e: any) => s + parseFloat(e.amount || "0"), 0);
    const monthlyProfit = monthlyRevenue - monthlyExpenses;

    const stats = [
        { title: "Revenue This Month", value: formatCurrency(monthlyRevenue), icon: DollarSign, color: "#10b981", bg: "#dcfce7" },
        { title: "Year to Date Revenue", value: formatCurrency(ytdRevenue), icon: TrendingUp, color: "#0d9488", bg: "#ccfbf1" },
        { title: "Outstanding Invoices", value: formatCurrency(outstandingTotal), icon: FileText, color: "#f59e0b", bg: "#fef3c7" },
        { title: "Total Clients", value: customers.length, icon: Users, color: "#3b82f6", bg: "#dbeafe" },
        { title: "Monthly Expenses", value: formatCurrency(monthlyExpenses), icon: DollarSign, color: "#ef4444", bg: "#fee2e2" },
        { title: "Monthly Profit", value: formatCurrency(monthlyProfit), icon: TrendingUp, color: "#8b5cf6", bg: "#ede9fe" },
    ];

    if (invLoading) return <div className={styles.loading}>Loading reports...</div>;

    return (
        <div className={styles.page}>
            <div className={styles.header}><div><h1 className={styles.title}>Reports</h1><p className={styles.subtitle}>Financial overview and business metrics</p></div></div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "32px" }}>
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "20px", display: "flex", alignItems: "center", gap: "16px" }}>
                            <div style={{ width: 48, height: 48, borderRadius: "12px", background: stat.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={24} color={stat.color} /></div>
                            <div>
                                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>{stat.title}</div>
                                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b" }}>{stat.value}</div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
