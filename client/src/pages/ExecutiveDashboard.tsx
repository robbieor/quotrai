import { useQuery } from "@tanstack/react-query";
import {
    DollarSign,
    Clock,
    Briefcase,
    CheckCircle,
    FileText,
    Plus,
    UserPlus,
    Cpu
} from "lucide-react";
import MetricCard from "../components/MetricCard";
import DataTable from "../components/DataTable";
import SalesSummary from "../components/SalesSummary";
import type { Column } from "../components/DataTable";
import type { DashboardData, Invoice } from "../types";
import styles from "./ExecutiveDashboard.module.css";

// Formatter utilities
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
    }).format(amount);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

export default function ExecutiveDashboard() {
    const { data: dashboard } = useQuery<DashboardData>({
        queryKey: ["/api/dashboard"],
    });

    const { data: invoices = [] } = useQuery<Invoice[]>({
        queryKey: ["/api/invoices"],
    });

    // Mock Sales Data (to be replaced with real backend calls later)
    const salesData = {
        enquiries: [
            { label: "New", count: 4, color: "#3b82f6", status: "new" },
            { label: "To Do", count: 2, color: "#f59e0b", status: "todo" },
        ],
        quotes: [
            { label: "Draft", count: 1, color: "#94a3b8", status: "draft" },
            { label: "Awaiting Acceptance", count: 3, color: "#0d9488", status: "awaiting" },
        ],
        invoices: [
            { label: "Draft", count: 2, color: "#94a3b8", status: "draft" },
            { label: "Unpaid", count: 5, color: "#f59e0b", status: "unpaid" },
            { label: "Overdue", count: 1, color: "#ef4444", status: "overdue" },
        ],
    };

    const revenueTrend = dashboard?.lastMonth?.revenue
        ? Math.round(((dashboard.thisMonth.revenue - dashboard.lastMonth.revenue) / dashboard.lastMonth.revenue) * 100)
        : 0;

    const quoteConversion = dashboard?.quotes?.totalThisMonth
        ? Math.round((dashboard.quotes.acceptedThisMonth / dashboard.quotes.totalThisMonth) * 100)
        : 0;

    const invoiceColumns: Column<Invoice>[] = [
        {
            key: "invoiceNumber",
            header: "Invoice",
            render: (row) => <span style={{ color: "#0d9488", fontWeight: 600 }}>#{row.invoiceNumber}</span>,
            sortable: true,
            width: "120px"
        },
        { key: "clientName", header: "Client", sortable: true },
        {
            key: "total",
            header: "Amount",
            render: (row) => <strong>{formatCurrency(parseFloat(row.total))}</strong>,
            sortable: true,
            width: "120px"
        },
        {
            key: "dueDate",
            header: "Due Date",
            render: (row) => formatDate(row.dueDate),
            sortable: true,
            width: "120px"
        },
        {
            key: "status",
            header: "Status",
            width: "100px",
            render: (row) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    paid: { bg: "#dcfce7", text: "#166534" },
                    sent: { bg: "#ccfbf1", text: "#0f766e" },
                    overdue: { bg: "#fee2e2", text: "#991b1b" },
                    draft: { bg: "#f1f5f9", text: "#475569" },
                };
                const style = colors[row.status] || colors.draft;
                return (
                    <span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>
                        {row.status}
                    </span>
                );
            },
        },
    ];

    return (
        <div className={styles.dashboard}>
            <div className={styles.metricsGrid}>
                <MetricCard
                    title="Total Revenue"
                    value={formatCurrency(dashboard?.thisMonth?.revenue || 0)}
                    icon={DollarSign}
                    iconColor="#0d9488"
                    iconBg="#f1f5f9"
                    trend={{ value: Math.abs(revenueTrend), isPositive: revenueTrend > 0, label: "vs last month" }}
                />
                <MetricCard
                    title="Outstanding"
                    value={formatCurrency(dashboard?.outstanding?.amount || 0)}
                    icon={Clock}
                    iconColor="#f59e0b"
                    iconBg="#f1f5f9"
                    subtitle={`${dashboard?.outstanding?.count || 0} unpaid invoices`}
                />
                <MetricCard
                    title="Active Jobs"
                    value={dashboard?.jobs?.active || 0}
                    icon={Briefcase}
                    iconColor="#3b82f6"
                    iconBg="#f1f5f9"
                    subtitle={`${dashboard?.jobs?.completedThisMonth || 0} completed this month`}
                />
                <MetricCard
                    title="Quote Conversion"
                    value={`${quoteConversion}%`}
                    icon={CheckCircle}
                    iconColor="#10b981"
                    iconBg="#f1f5f9"
                    subtitle={`${dashboard?.quotes?.acceptedThisMonth || 0} of ${dashboard?.quotes?.totalThisMonth || 0} accepted`}
                />
            </div>

            <div className={styles.mainContent}>
                <div className={styles.leftColumn}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Recent Activity</h2>
                            <a href="/activity" className={styles.viewAll}>View All</a>
                        </div>
                        <div className={styles.activityList}>
                            {invoices.slice(0, 5).map((invoice) => (
                                <div key={invoice.id} className={styles.activityItem}>
                                    <div className={styles.activityIcon} style={{ backgroundColor: "#f1f5f9" }}>
                                        <FileText size={18} color="#64748b" />
                                    </div>
                                    <div className={styles.activityContent}>
                                        <span className={styles.activityText}>Invoice #{invoice.invoiceNumber} for {invoice.clientName}</span>
                                        <span className={styles.activityMeta}>{formatCurrency(parseFloat(invoice.total))} • {formatDate(invoice.createdAt)}</span>
                                    </div>
                                    <span className={styles.statusBadge} style={{
                                        backgroundColor: invoice.status === "paid" ? "#dcfce7" : "#f1f5f9",
                                        color: invoice.status === "paid" ? "#166534" : "#64748b"
                                    }}>
                                        {invoice.status}
                                    </span>
                                </div>
                            ))}
                            {invoices.length === 0 && (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                    No recent activity found.
                                </div>
                            )}
                        </div>
                    </div>

                    <DataTable<Invoice>
                        title="Recent Invoices"
                        columns={invoiceColumns}
                        data={invoices.slice(0, 5)}
                        pageSize={5}
                    />
                </div>

                <div className={styles.rightColumn}>
                    <SalesSummary data={salesData} />

                    <div style={{ marginTop: "24px" }} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Upcoming Deadlines</h2>
                        </div>
                        <div className={styles.activityList}>
                            {(dashboard?.upcomingDue || []).slice(0, 5).map((item, idx) => (
                                <div key={idx} className={styles.deadlineItem}>
                                    <div className={styles.activityContent}>
                                        <span className={styles.activityText}>Invoice #{item.invoiceNumber}</span>
                                        <span className={styles.activityMeta}>Due {formatDate(item.dueDate)}</span>
                                    </div>
                                    <span className={styles.statusBadge} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                                        Due soon
                                    </span>
                                </div>
                            ))}
                            {(!dashboard?.upcomingDue || dashboard.upcomingDue.length === 0) && (
                                <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                                    No upcoming deadlines.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 style={{ marginBottom: "16px" }} className={styles.cardTitle}>Quick Actions</h2>
                <div className={styles.quickActions}>
                    <div className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <Plus size={24} color="#0d9488" />
                        </div>
                        <span className={styles.quickActionLabel}>New Quote</span>
                    </div>
                    <div className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <FileText size={24} color="#3b82f6" />
                        </div>
                        <span className={styles.quickActionLabel}>Create Invoice</span>
                    </div>
                    <div className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <UserPlus size={24} color="#f59e0b" />
                        </div>
                        <span className={styles.quickActionLabel}>Add Client</span>
                    </div>
                    <div className={styles.quickAction}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <Cpu size={24} color="#8b5cf6" />
                        </div>
                        <span className={styles.quickActionLabel}>Ask Foreman AI</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
