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
import SalesSummary from "../components/SalesSummary";
import { SkeletonMetricCard, SkeletonSalesSummary } from "../components/Skeleton";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import styles from "./ExecutiveDashboard.module.css";

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount);

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });

export default function ExecutiveDashboard() {
    const navigate = useNavigate();
    const { teamId } = useAuth();

    // Fetch invoices directly from Supabase
    const { data: invoices = [], isLoading: invoicesLoading } = useQuery({
        queryKey: ["invoices", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("invoices")
                .select("*, customers(name)")
                .eq("team_id", teamId)
                .order("created_at", { ascending: false })
                .limit(20);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const { data: quotes = [], isLoading: quotesLoading } = useQuery({
        queryKey: ["quotes", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("quotes")
                .select("*")
                .eq("team_id", teamId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const isLoading = invoicesLoading || quotesLoading;

    // Compute metrics from raw data
    const totalRevenue = invoices
        .filter((i: any) => i.status === "paid")
        .reduce((sum: number, i: any) => sum + parseFloat(i.total || "0"), 0);

    const outstanding = invoices.filter((i: any) => i.status === "sent" || i.status === "overdue");
    const outstandingTotal = outstanding.reduce((sum: number, i: any) => sum + parseFloat(i.total || "0"), 0);
    const overdueCount = invoices.filter((i: any) => i.status === "overdue").length;

    const openQuotes = quotes.filter((q: any) => q.status === "sent" || q.status === "draft");
    const openQuotesTotal = openQuotes.reduce((sum: number, q: any) => sum + parseFloat(q.total || "0"), 0);

    const quoteConversion = quotes.length > 0
        ? Math.round(((quotes.length - openQuotes.length) / quotes.length) * 100)
        : 0;

    const salesData = {
        enquiries: [
            { label: "New", count: openQuotes.length, color: "#3b82f6", status: "new" },
        ],
        quotes: [
            { label: "Draft", count: quotes.filter((q: any) => q.status === "draft").length, color: "#94a3b8", status: "draft" },
            { label: "Awaiting Acceptance", count: quotes.filter((q: any) => q.status === "sent").length, color: "#0d9488", status: "awaiting" },
        ],
        invoices: [
            { label: "Draft", count: invoices.filter((i: any) => i.status === "draft").length, color: "#94a3b8", status: "draft" },
            { label: "Unpaid", count: invoices.filter((i: any) => i.status === "sent").length, color: "#f59e0b", status: "unpaid" },
            { label: "Overdue", count: overdueCount, color: "#ef4444", status: "overdue" },
        ],
    };

    const recentInvoices = invoices.slice(0, 5);

    return (
        <div className={styles.dashboard}>
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
                            value={formatCurrency(totalRevenue)}
                            icon={DollarSign}
                            iconColor="#0d9488"
                            iconBg="#f1f5f9"
                        />
                        <MetricCard
                            title="Outstanding"
                            value={formatCurrency(outstandingTotal)}
                            icon={Clock}
                            iconColor="#f59e0b"
                            iconBg="#f1f5f9"
                            subtitle={`${outstanding.length} unpaid invoices`}
                        />
                        <MetricCard
                            title="Active Quotes"
                            value={openQuotes.length}
                            icon={Briefcase}
                            iconColor="#3b82f6"
                            iconBg="#f1f5f9"
                            subtitle={`${formatCurrency(openQuotesTotal)} total value`}
                        />
                        <MetricCard
                            title="Quote Conversion"
                            value={`${quoteConversion}%`}
                            icon={CheckCircle}
                            iconColor="#10b981"
                            iconBg="#f1f5f9"
                            subtitle={`${quotes.length} total quotes`}
                        />
                    </>
                )}
            </div>

            <div className={styles.mainContent}>
                <div className={styles.leftColumn}>
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h2 className={styles.cardTitle}>Recent Activity</h2>
                            <a href="/invoices" className={styles.viewAll}>View All</a>
                        </div>
                        <div className={styles.activityList}>
                            {isLoading ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>Loading...</div>
                            ) : recentInvoices.length === 0 ? (
                                <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
                                    No recent activity found.
                                </div>
                            ) : (
                                recentInvoices.map((invoice: any) => (
                                    <div key={invoice.id} className={styles.activityItem}>
                                        <div className={styles.activityIcon} style={{ backgroundColor: "#f1f5f9" }}>
                                            <FileText size={18} color="#64748b" />
                                        </div>
                                        <div className={styles.activityContent}>
                                            <span className={styles.activityText}>
                                                Invoice #{invoice.invoice_number} for {invoice.customers?.name || "Unknown"}
                                            </span>
                                            <span className={styles.activityMeta}>
                                                {formatCurrency(parseFloat(invoice.total || "0"))} • {formatDate(invoice.created_at)}
                                            </span>
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
                </div>

                <div className={styles.rightColumn}>
                    {isLoading ? (
                        <SkeletonSalesSummary />
                    ) : (
                        <SalesSummary data={salesData} />
                    )}
                </div>
            </div>

            <div>
                <h2 style={{ marginBottom: "16px" }} className={styles.cardTitle}>Quick Actions</h2>
                <div className={styles.quickActions}>
                    <div className={styles.quickAction} onClick={() => navigate("/quotes?action=new")} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <Plus size={24} color="#0d9488" />
                        </div>
                        <span className={styles.quickActionLabel}>New Quote</span>
                    </div>
                    <div className={styles.quickAction} onClick={() => navigate("/invoices?action=new")} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <FileText size={24} color="#3b82f6" />
                        </div>
                        <span className={styles.quickActionLabel}>Create Invoice</span>
                    </div>
                    <div className={styles.quickAction} onClick={() => navigate("/clients?action=new")} style={{ cursor: "pointer" }}>
                        <div className={styles.quickActionIcon} style={{ backgroundColor: "#f1f5f9" }}>
                            <UserPlus size={24} color="#f59e0b" />
                        </div>
                        <span className={styles.quickActionLabel}>Add Client</span>
                    </div>
                    <div className={styles.quickAction} onClick={() => navigate("/foreman")} style={{ cursor: "pointer" }}>
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
