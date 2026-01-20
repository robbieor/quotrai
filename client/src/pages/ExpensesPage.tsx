import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Receipt, DollarSign, Calendar } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Expense } from "../types";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
    }).format(num);
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

export default function ExpensesPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: expenses = [], isLoading } = useQuery<Expense[]>({
        queryKey: ["/api/expenses"],
    });

    const filteredExpenses = expenses.filter((expense) => {
        return (
            expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);

    const columns: Column<Expense>[] = [
        {
            key: "description",
            header: "Description",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        background: "#fef3c7",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <Receipt size={16} color="#f59e0b" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{row.description}</span>
                </div>
            ),
            sortable: true,
        },
        {
            key: "category",
            header: "Category",
            render: (row) => (
                <span className={styles.statusBadge} style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                    {row.category || "General"}
                </span>
            ),
            sortable: true,
            width: "130px",
        },
        {
            key: "amount",
            header: "Amount",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <DollarSign size={14} color="#ef4444" />
                    <strong style={{ color: "#ef4444" }}>{formatCurrency(row.amount)}</strong>
                </div>
            ),
            sortable: true,
            width: "120px",
        },
        {
            key: "date",
            header: "Date",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <Calendar size={14} />
                    {formatDate(row.date)}
                </div>
            ),
            sortable: true,
            width: "130px",
        },
        {
            key: "vendor",
            header: "Vendor",
            render: (row) => row.vendor || "—",
            sortable: true,
            width: "150px",
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Expenses</h1>
                    <p className={styles.subtitle}>Track business expenses and receipts</p>
                </div>
                <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                    <Plus size={20} />
                    Add Expense
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search expenses..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>
                <div className={styles.stats}>
                    <span className={styles.stat}>
                        <strong>{expenses.length}</strong> Expenses
                    </span>
                    <span className={styles.stat}>
                        <strong>{formatCurrency(totalExpenses)}</strong> Total
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading expenses...</div>
            ) : (
                <DataTable<Expense>
                    title=""
                    columns={columns}
                    data={filteredExpenses}
                    pageSize={10}
                />
            )}

            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Expense</h2>
                        <p style={{ color: "#64748b", marginBottom: "24px" }}>
                            Expense form coming soon. This will include receipt upload and category selection.
                        </p>
                        <button className={styles.cancelButton} onClick={() => setShowCreateModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
