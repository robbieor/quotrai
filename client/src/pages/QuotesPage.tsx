import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, CheckCircle, Clock, ArrowRight, X, Trash2 } from "lucide-react";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Quote, Client } from "../types";
import { apiRequest } from "../lib/api";
import ClientSelector from "../components/ClientSelector";
import LineItemsEditor, { type LineItem } from "../components/LineItemsEditor";
import styles from "./InvoicesPage.module.css";

interface QuoteWithClient extends Quote {
    client?: Client;
}

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(num || 0);
};

const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
};

export default function QuotesPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingQuote, setEditingQuote] = useState<QuoteWithClient | null>(null);
    const [showConvertDialog, setShowConvertDialog] = useState<QuoteWithClient | null>(null);

    // Form state
    const [clientId, setClientId] = useState<number | null>(null);
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
    const [validUntil, setValidUntil] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
    });
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
    const [vatRate, setVatRate] = useState("0.23");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");

    const { data: quotes = [], isLoading } = useQuery<QuoteWithClient[]>({
        queryKey: ["/api/quotes"],
    });

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            // Clear the param
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/quotes", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/quotes/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/quotes/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
        },
    });

    const convertMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await apiRequest("POST", `/api/quotes/${id}/convert`);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
            setShowConvertDialog(null);
        },
    });

    const resetForm = () => {
        setClientId(null);
        setQuoteDate(new Date().toISOString().split("T")[0]);
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setValidUntil(d.toISOString().split("T")[0]);
        setItems([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
        setVatRate("0.23");
        setDiscount("0");
        setNotes("");
        setEditingQuote(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = async (quote: QuoteWithClient) => {
        const res = await apiRequest("GET", `/api/quotes/${quote.id}`);
        const fullQuote = await res.json();

        setEditingQuote(fullQuote);
        setClientId(fullQuote.clientId);
        setQuoteDate(fullQuote.date?.split("T")[0] || "");
        setValidUntil(fullQuote.validUntil?.split("T")[0] || "");
        setItems(fullQuote.items?.length > 0 ? fullQuote.items : [{ description: "", quantity: "1", rate: "0", amount: "0" }]);
        setVatRate(fullQuote.vatRate || "0.23");
        setDiscount(fullQuote.discount || "0");
        setNotes(fullQuote.notes || "");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientId) return;

        const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        const discountAmount = parseFloat(discount) || 0;
        const taxable = Math.max(0, subtotal - discountAmount);
        const vatAmount = taxable * parseFloat(vatRate);
        const total = taxable + vatAmount;

        const data = {
            clientId,
            date: quoteDate,
            validUntil,
            items,
            subtotal,
            discount: discountAmount,
            vatRate,
            vatAmount,
            total,
            notes,
        };

        if (editingQuote) {
            updateMutation.mutate({ id: editingQuote.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (quote: QuoteWithClient) => {
        if (confirm(`Delete quote ${quote.quoteNumber}?`)) {
            deleteMutation.mutate(quote.id);
        }
    };

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const vatAmount = taxable * parseFloat(vatRate);
    const total = taxable + vatAmount;

    const columns: Column<QuoteWithClient>[] = [
        { key: "quoteNumber", header: "Quote #", render: (q) => <strong>{q.quoteNumber}</strong> },
        { key: "client", header: "Client", render: (q) => q.client?.name || "—" },
        { key: "date", header: "Date", render: (q) => formatDate(q.date) },
        { key: "validUntil", header: "Valid Until", render: (q) => q.validUntil ? formatDate(q.validUntil) : "—" },
        { key: "total", header: "Total", render: (q) => <strong>{formatCurrency(q.total)}</strong> },
        {
            key: "status", header: "Status", render: (q) => {
                const statusStyles: Record<string, { bg: string; color: string; icon: any }> = {
                    open: { bg: "#dbeafe", color: "#2563eb", icon: FileText },
                    accepted: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle },
                    declined: { bg: "#fee2e2", color: "#dc2626", icon: Clock },
                    converted: { bg: "#f3e8ff", color: "#9333ea", icon: ArrowRight },
                };
                const s = statusStyles[q.status] || statusStyles.open;
                const Icon = s.icon;
                return (
                    <span className={styles.statusBadge} style={{ background: s.bg, color: s.color }}>
                        <Icon size={12} /> {q.status}
                    </span>
                );
            }
        },
        {
            key: "actions", header: "", render: (q) => (
                <div className={styles.actions}>
                    {q.status !== "converted" && (
                        <button className={styles.editBtn} onClick={() => setShowConvertDialog(q)}>
                            <ArrowRight size={14} /> Invoice
                        </button>
                    )}
                    <button className={styles.editBtn} onClick={() => openEditModal(q)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(q)}><Trash2 size={14} /></button>
                </div>
            )
        }
    ];

    const filtered = quotes.filter(q =>
        q.quoteNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Quotes</h1>
                <button className={styles.createBtn} onClick={openCreateModal}>
                    <Plus size={18} />
                    New Quote
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search quotes..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading quotes...</div>
            ) : (
                <DataTable columns={columns} data={filtered} emptyMessage="No quotes yet. Create your first quote!" />
            )}



            {/* Create/Edit Modal */}
            <Modal
                isOpen={showModal}
                onClose={closeModal}
                title={editingQuote ? "Edit Quote" : "Create Quote"}
                maxWidth={800}
                footer={
                    <>
                        <Button variant="secondary" onClick={closeModal}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            loading={createMutation.isPending || updateMutation.isPending}
                            disabled={!clientId}
                        >
                            {editingQuote ? "Update Quote" : "Create Quote"}
                        </Button>
                    </>
                }
            >
                <div className={styles.modalForm}>
                    <div className={styles.formSection}>
                        <label className={styles.label}>Client *</label>
                        <ClientSelector value={clientId} onChange={(id) => setClientId(id)} />
                    </div>

                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Quote Date</label>
                            <input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={styles.input} />
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Valid Until</label>
                            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={styles.input} />
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
                    </div>

                    <div className={styles.formSection}>
                        <label className={styles.label}>Notes</label>
                        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Additional details..." />
                    </div>

                    <div className={styles.totalsBox}>
                        <div className={styles.totalLine}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {discountAmount > 0 && <div className={styles.totalLine}><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                        <div className={styles.totalLine}><span>VAT ({(parseFloat(vatRate) * 100).toFixed(0)}%)</span><span>{formatCurrency(vatAmount)}</span></div>
                        <div className={styles.totalLineBold}><span>Total</span><span>{formatCurrency(total)}</span></div>
                    </div>
                </div>
            </Modal>

            {/* Convert to Invoice Dialog */}
            {showConvertDialog && (
                <div className={styles.modalOverlay} onClick={() => setShowConvertDialog(null)}>
                    <div className={styles.modal} style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Convert to Invoice</h2>
                            <button className={styles.closeBtn} onClick={() => setShowConvertDialog(null)}><X size={20} /></button>
                        </div>
                        <div style={{ padding: 24 }}>
                            <p style={{ marginBottom: 20, color: "var(--color-text-secondary)" }}>
                                Convert quote <strong>{showConvertDialog.quoteNumber}</strong> to an invoice?
                                This will create a new draft invoice with the same items.
                            </p>
                            <div className={styles.modalFooter} style={{ padding: 0, border: "none" }}>
                                <button className={styles.cancelBtn} onClick={() => setShowConvertDialog(null)}>Cancel</button>
                                <button
                                    className={styles.submitBtn}
                                    onClick={() => convertMutation.mutate(showConvertDialog.id)}
                                    disabled={convertMutation.isPending}
                                >
                                    {convertMutation.isPending ? "Converting..." : "Convert to Invoice"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
