import { useQuery } from "@tanstack/react-query";
import { TrendingUp, DollarSign, FileText, Users } from "lucide-react";
import type { DashboardData } from "../types";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
    }).format(amount);
};

export default function ReportsPage() {
    const { data: dashboard, isLoading } = useQuery<DashboardData>({
        queryKey: ["/api/dashboard"],
    });

    const stats = [
        {
            title: "Revenue This Month",
            value: formatCurrency(dashboard?.monthly?.revenue || 0),
            icon: DollarSign,
            color: "#10b981",
            bg: "#dcfce7"
        },
        {
            title: "Year to Date Revenue",
            value: formatCurrency(dashboard?.ytd?.revenue || 0),
            icon: TrendingUp,
            color: "#0d9488",
            bg: "#ccfbf1"
        },
        {
            title: "Outstanding Invoices",
            value: formatCurrency(dashboard?.outstanding?.total || 0),
            icon: FileText,
            color: "#f59e0b",
            bg: "#fef3c7"
        },
        {
            title: "Total Clients",
            value: dashboard?.summary?.totalClients || 0,
            icon: Users,
            color: "#3b82f6",
            bg: "#dbeafe"
        },
        {
            title: "Monthly Expenses",
            value: formatCurrency(dashboard?.monthly?.expenses || 0),
            icon: DollarSign,
            color: "#ef4444",
            bg: "#fee2e2"
        },
        {
            title: "Monthly Profit",
            value: formatCurrency(dashboard?.monthly?.profit || 0),
            icon: TrendingUp,
            color: "#8b5cf6",
            bg: "#ede9fe"
        },
    ];

    if (isLoading) {
        return <div className={styles.loading}>Loading reports...</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Reports</h1>
                    <p className={styles.subtitle}>Financial overview and business metrics</p>
                </div>
            </div>

            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
                marginBottom: "32px"
            }}>
                {stats.map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                        <div key={idx} style={{
                            background: "white",
                            borderRadius: "12px",
                            border: "1px solid #e2e8f0",
                            padding: "20px",
                            display: "flex",
                            alignItems: "center",
                            gap: "16px"
                        }}>
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: "12px",
                                background: stat.bg,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}>
                                <Icon size={24} color={stat.color} />
                            </div>
                            <div>
                                <div style={{ fontSize: "13px", color: "#64748b", marginBottom: "4px" }}>
                                    {stat.title}
                                </div>
                                <div style={{ fontSize: "22px", fontWeight: 700, color: "#1e293b" }}>
                                    {stat.value}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Aging Report */}
            <div style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "24px"
            }}>
                <h3 style={{ margin: "0 0 20px 0", fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>
                    Accounts Receivable Aging
                </h3>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "16px"
                }}>
                    {[
                        { label: "Current", value: dashboard?.aging?.current || 0, color: "#10b981" },
                        { label: "30+ Days", value: dashboard?.aging?.days30 || 0, color: "#f59e0b" },
                        { label: "60+ Days", value: dashboard?.aging?.days60 || 0, color: "#f97316" },
                        { label: "90+ Days", value: dashboard?.aging?.days90Plus || 0, color: "#ef4444" },
                    ].map((item, idx) => (
                        <div key={idx} style={{
                            padding: "16px",
                            background: "#f8fafc",
                            borderRadius: "8px",
                            textAlign: "center"
                        }}>
                            <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: "20px", fontWeight: 700, color: item.color }}>
                                {formatCurrency(item.value)}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
