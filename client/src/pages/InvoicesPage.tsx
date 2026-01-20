import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Send, CheckCircle, XCircle, X, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Invoice, Client } from "../types";
import { apiRequest } from "../lib/api";
import ClientSelector from "../components/ClientSelector";
import LineItemsEditor, { type LineItem } from "../components/LineItemsEditor";
import styles from "./InvoicesPage.module.css";

interface InvoiceWithClient extends Invoice {
    client?: Client;
}

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(num || 0);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
};

export default function InvoicesPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<InvoiceWithClient | null>(null);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    // Form state
    const [clientId, setClientId] = useState<number | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
    const [dueDate, setDueDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
    });
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
    const [vatRate, setVatRate] = useState("0.23");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");
    const [poNumber, setPoNumber] = useState("");
    const [status, setStatus] = useState<"draft" | "sent" | "paid">("draft");

    const { data: invoices = [], isLoading } = useQuery<InvoiceWithClient[]>({
        queryKey: ["/api/invoices"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/invoices", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/invoices/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/invoices/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
        },
    });

    const resetForm = () => {
        setClientId(null);
        setInvoiceDate(new Date().toISOString().split("T")[0]);
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setDueDate(d.toISOString().split("T")[0]);
        setItems([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
        setVatRate("0.23");
        setDiscount("0");
        setNotes("");
        setPoNumber("");
        setStatus("draft");
        setEditingInvoice(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = async (invoice: InvoiceWithClient) => {
        // Fetch full invoice with items
        const res = await apiRequest("GET", `/api/invoices/${invoice.id}`);
        const fullInvoice = await res.json();

        setEditingInvoice(fullInvoice);
        setClientId(fullInvoice.clientId);
        setInvoiceDate(fullInvoice.date?.split("T")[0] || "");
        setDueDate(fullInvoice.dueDate?.split("T")[0] || "");
        setItems(fullInvoice.items?.length > 0 ? fullInvoice.items : [{ description: "", quantity: "1", rate: "0", amount: "0" }]);
        setVatRate(fullInvoice.vatRate || "0.23");
        setDiscount(fullInvoice.discount || "0");
        setNotes(fullInvoice.notes || "");
        setPoNumber(fullInvoice.poNumber || "");
        setStatus(fullInvoice.status || "draft");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) return;

        const discountAmount = parseFloat(discount) || 0;

        const data = {
            clientId,
            date: invoiceDate,
            dueDate,
            items,
            vatRate,
            discount: discountAmount,
            notes,
            poNumber,
            status,
        };

        if (editingInvoice) {
            updateMutation.mutate({ id: editingInvoice.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (invoice: InvoiceWithClient) => {
        if (confirm(`Delete invoice ${invoice.invoiceNumber}?`)) {
            deleteMutation.mutate(invoice.id);
        }
    };

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const vatAmount = taxable * parseFloat(vatRate);
    const total = taxable + vatAmount;

    const columns: Column<InvoiceWithClient>[] = [
        { key: "invoiceNumber", header: "Invoice #", render: (inv) => <strong>{inv.invoiceNumber}</strong> },
        { key: "client", header: "Client", render: (inv) => inv.client?.name || inv.clientName || "—" },
        { key: "date", header: "Date", render: (inv) => formatDate(inv.date) },
        { key: "dueDate", header: "Due", render: (inv) => formatDate(inv.dueDate) },
        { key: "total", header: "Total", render: (inv) => <strong>{formatCurrency(inv.total)}</strong> },
        {
            key: "status", header: "Status", render: (inv) => {
                const statusStyles: Record<string, { bg: string; color: string; icon: any }> = {
                    draft: { bg: "#f1f5f9", color: "#64748b", icon: FileText },
                    sent: { bg: "#dbeafe", color: "#2563eb", icon: Send },
                    paid: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle },
                    overdue: { bg: "#fee2e2", color: "#dc2626", icon: XCircle },
                };
                const s = statusStyles[inv.status] || statusStyles.draft;
                const Icon = s.icon;
                return (
                    <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {inv.status}
                    </span>
                );
            }
        },
        {
            key: "actions", header: "", render: (inv) => (
                <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEditModal(inv)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(inv)}><Trash2 size={14} /></button>
                </div>
            )
        }
    ];

    const filtered = invoices.filter(inv =>
        inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Invoices</h1>
                <button className={styles.createBtn} onClick={openCreateModal}>
                    <Plus size={18} />
                    New Invoice
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search invoices..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading invoices...</div>
            ) : (
                <DataTable columns={columns} data={filtered} emptyMessage="No invoices yet. Create your first invoice!" />
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingInvoice ? "Edit Invoice" : "Create Invoice"}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formSection}>
                                <label className={styles.label}>Client *</label>
                                <ClientSelector value={clientId} onChange={(id) => setClientId(id)} />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Invoice Date</label>
                                    <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Due Date</label>
                                    <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className={styles.input}>
                                        <option value="draft">Draft</option>
                                        <option value="sent">Sent</option>
                                        <option value="paid">Paid</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Line Items</label>
                                <LineItemsEditor items={items} onChange={setItems} />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Discount (€)</label>
                                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className={styles.input} step="0.01" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>VAT Rate</label>
                                    <select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={styles.input}>
                                        <option value="0">0%</option>
                                        <option value="0.09">9%</option>
                                        <option value="0.135">13.5%</option>
                                        <option value="0.23">23%</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>PO Number</label>
                                    <input type="text" value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className={styles.input} placeholder="Optional" />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Payment terms, additional info..." />
                            </div>

                            <div className={styles.totalsBox}>
                                <div className={styles.totalLine}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                                {discountAmount > 0 && <div className={styles.totalLine}><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                                <div className={styles.totalLine}><span>VAT ({(parseFloat(vatRate) * 100).toFixed(0)}%)</span><span>{formatCurrency(vatAmount)}</span></div>
                                <div className={styles.totalLineBold}><span>Total</span><span>{formatCurrency(total)}</span></div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!clientId || createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingInvoice ? "Update Invoice" : "Create Invoice"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
