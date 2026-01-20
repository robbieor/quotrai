import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
import { SkeletonMetricCard, SkeletonActivityItem, SkeletonSalesSummary, SkeletonTable } from "../components/Skeleton";
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
    const navigate = useNavigate();

    const { data: dashboard, isLoading } = useQuery<DashboardData>({
        queryKey: ["/api/dashboard"],
    });

    // Derive sales summary data from dashboard API response
    const salesData = {
        enquiries: [
            { label: "New", count: dashboard?.quotes?.open || 0, color: "#3b82f6", status: "new" },
            { label: "To Do", count: dashboard?.needsAttention?.expiringQuotes?.length || 0, color: "#f59e0b", status: "todo" },
        ],
        quotes: [
            { label: "Draft", count: dashboard?.quotes?.total ? Math.max(0, dashboard.quotes.total - dashboard.quotes.open) : 0, color: "#94a3b8", status: "draft" },
            { label: "Awaiting Acceptance", count: dashboard?.quotes?.open || 0, color: "#0d9488", status: "awaiting" },
        ],
        invoices: [
            { label: "Draft", count: dashboard?.outstanding?.count ? Math.floor(dashboard.outstanding.count * 0.2) : 0, color: "#94a3b8", status: "draft" },
            { label: "Unpaid", count: Math.max(0, (dashboard?.outstanding?.count || 0) - (dashboard?.outstanding?.overdueCount || 0)), color: "#f59e0b", status: "unpaid" },
            { label: "Overdue", count: dashboard?.outstanding?.overdueCount || 0, color: "#ef4444", status: "overdue" },
        ],
    };

    // Format recent invoices for the table
    const recentInvoices: Invoice[] = (dashboard?.recentInvoices || []).map(inv => ({
        id: inv.id,
        clientId: inv.clientId || inv.client?.id || 0,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.client?.name || "Unknown Client",
        total: inv.total,
        date: inv.date,
        dueDate: inv.dueDate,
        status: inv.status,
        createdAt: inv.createdAt,
    }));

    const revenueTrend = dashboard?.lastWeek?.revenue
        ? Math.round(((dashboard.thisWeek.revenue - dashboard.lastWeek.revenue) / dashboard.lastWeek.revenue) * 100)
        : 0;

    const quoteConversion = dashboard?.quotes?.total
        ? Math.round(((dashboard.quotes.total - dashboard.quotes.open) / dashboard.quotes.total) * 100)
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

    // Quick Action handlers
    const handleNewQuote = () => navigate("/quotes?action=new");
    const handleCreateInvoice = () => navigate("/invoices?action=new");
    const handleAddClient = () => navigate("/clients?action=new");
    const handleForemanAI = () => navigate("/foreman");

    return (
        <div className={styles.dashboard}>
            {/* Metrics Grid - with skeleton loading */}
            <div className={styles.metricsGrid}>
                {isLoading ? (
                    <>
                        <SkeletonMetricCard />
                        <SkeletonMetricCard />
                        <SkeletonMetricCard />
                        <SkeletonMetricCard />
                    </>
                ) : (
                    <>
                        <MetricCard
                            title="Total Revenue"
                            value={formatCurrency(dashboard?.monthly?.revenue || 0)}
                            icon={DollarSign}
                            iconColor="#0d9488"
                            iconBg="#f1f5f9"
                            trend={{ value: Math.abs(revenueTrend), isPositive: revenueTrend > 0, label: "vs last week" }}
                        />
                        <MetricCard
                            title="Outstanding"
                            value={formatCurrency(dashboard?.outstanding?.total || 0)}
                            icon={Clock}
                            iconColor="#f59e0b"
                            iconBg="#f1f5f9"
                            subtitle={`${dashboard?.outstanding?.count || 0} unpaid invoices`}
                        />
                        <MetricCard
                            title="Active Quotes"
                            value={dashboard?.quotes?.open || 0}
                            icon={Briefcase}
                            iconColor="#3b82f6"
                            iconBg="#f1f5f9"
                            subtitle={`${formatCurrency(dashboard?.quotes?.openTotal || 0)} total value`}
                        />
                        <MetricCard
                            title="Quote Conversion"
                            value={`${quoteConversion}%`}
                            icon={CheckCircle}
                            iconColor="#10b981"
                            iconBg="#f1f5f9"
                            subtitle={`${dashboard?.quotes?.total || 0} total quotes`}
                        />
                    </>
                )}
            </div>

            <div className={styles.mainContent}>
                <div className={styles.leftColumn}>
                    {/* Recent Activity Card - with skeleton loading */}
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Recent Activity</h2>
                            <a href="/invoices" className={styles.viewAll}>View All</a>
                        </div>
                        <div className={styles.activityList}>
                            {isLoading ? (
                                <>
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                </>
                            ) : recentInvoices.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                    No recent activity found.
                                </div>
                            ) : (
                                recentInvoices.slice(0, 5).map((invoice) => (
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
                                ))
                            )}
                        </div>
                    </div>

                    {/* Recent Invoices Table - with skeleton loading */}
                    {isLoading ? (
                        <SkeletonTable rows={5} columns={5} />
                    ) : (
                        <DataTable<Invoice>
                            title="Recent Invoices"
                            columns={invoiceColumns}
                            data={recentInvoices.slice(0, 5)}
                            pageSize={5}
                        />
                    )}
                </div>

                <div className={styles.rightColumn}>
                    {/* Sales Summary - with skeleton loading */}
                    {isLoading ? (
                        <SkeletonSalesSummary />
                    ) : (
                        <SalesSummary data={salesData} />
                    )}

                    {/* Upcoming Deadlines - with skeleton loading */}
                    <div style={{ marginTop: "24px" }} className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Upcoming Deadlines</h2>
                        </div>
                        <div className={styles.activityList}>
                            {isLoading ? (
                                <>
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                    <SkeletonActivityItem />
                                </>
                            ) : (!dashboard?.needsAttention?.upcomingOverdue || dashboard.needsAttention.upcomingOverdue.length === 0) ? (
                                <div style={{ padding: "24px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>
                                    No upcoming deadlines.
                                </div>
                            ) : (
                                (dashboard?.needsAttention?.upcomingOverdue || []).slice(0, 5).map((item: any, idx: number) => (
                                    <div key={idx} className={styles.deadlineItem}>
                                        <div className={styles.activityContent}>
                                            <span className={styles.activityText}>Invoice #{item.invoiceNumber}</span>
                                            <span className={styles.activityMeta}>Due {formatDate(item.dueDate)}</span>
                                        </div>
                                        <span className={styles.statusBadge} style={{ backgroundColor: "#fee2e2", color: "#991b1b" }}>
                                            Due soon
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div>
                <h2 style={{ marginBottom: "16px" }} className={styles.cardTitle}>Quick Actions</h2>
                <div className={styles.quickActions}>
                    <div className={styles.quickAction} onClick={handleNewQuote} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <Plus size={24} color="#0d9488" />
                        </div>
                        <span className={styles.quickActionLabel}>New Quote</span>
                    </div>
                    <div className={styles.quickAction} onClick={handleCreateInvoice} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <FileText size={24} color="#3b82f6" />
                        </div>
                        <span className={styles.quickActionLabel}>Create Invoice</span>
                    </div>
                    <div className={styles.quickAction} onClick={handleAddClient} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <UserPlus size={24} color="#f59e0b" />
                        </div>
                        <span className={styles.quickActionLabel}>Add Client</span>
                    </div>
                    <div className={styles.quickAction} onClick={handleForemanAI} style={{ cursor: "pointer" }}>
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
