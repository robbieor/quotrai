import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, CheckCircle, Clock, ArrowRight, X, Trash2 } from "lucide-react";
import { Modal } from "../components/ui/Modal";
import { Button } from "../components/ui/Button";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import ClientSelector from "../components/ClientSelector";
import LineItemsEditor, { type LineItem } from "../components/LineItemsEditor";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(num || 0);
};
const formatDate = (date: string) => new Date(date).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });

export default function QuotesPage() {
    const queryClient = useQueryClient();
    const { teamId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingQuote, setEditingQuote] = useState<any>(null);

    const [clientId, setClientId] = useState<string | null>(null);
    const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
    const [validUntil, setValidUntil] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; });
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
    const [vatRate, setVatRate] = useState("0.23");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");

    const { data: quotes = [], isLoading } = useQuery({
        queryKey: ["quotes", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("quotes")
                .select("*, customers(name)")
                .eq("team_id", teamId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const count = quotes.length + 1;
            const quoteNumber = `QT-${String(count).padStart(4, "0")}`;
            const subtotal = data.items.reduce((s: number, i: LineItem) => s + (parseFloat(i.amount) || 0), 0);
            const discountAmt = parseFloat(data.discount) || 0;
            const taxable = Math.max(0, subtotal - discountAmt);
            const taxAmt = taxable * parseFloat(data.vatRate);
            const total = taxable + taxAmt;

            const { data: qt, error } = await supabase.from("quotes").insert({
                team_id: teamId!,
                customer_id: data.clientId,
                quote_number: quoteNumber,
                valid_until: data.validUntil,
                status: "draft",
                notes: data.notes || null,
                subtotal, tax_rate: parseFloat(data.vatRate) * 100, tax_amount: taxAmt,
                discount_value: discountAmt, total,
            }).select().single();
            if (error) throw error;

            if (qt && data.items.length > 0) {
                const lineItems = data.items.filter((i: LineItem) => i.description.trim()).map((i: LineItem) => ({
                    quote_id: qt.id, description: i.description, quantity: parseFloat(i.quantity) || 1,
                    unit_price: parseFloat(i.rate) || 0, total_price: parseFloat(i.amount) || 0,
                }));
                if (lineItems.length > 0) {
                    const { error: e } = await supabase.from("quote_items").insert(lineItems);
                    if (e) throw e;
                }
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quotes"] }); closeModal(); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("quote_items").delete().eq("quote_id", id);
            const { error } = await supabase.from("quotes").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["quotes"] }); },
    });

    const resetForm = () => {
        setClientId(null); setQuoteDate(new Date().toISOString().split("T")[0]);
        const d = new Date(); d.setDate(d.getDate() + 30); setValidUntil(d.toISOString().split("T")[0]);
        setItems([{ description: "", quantity: "1", rate: "0", amount: "0" }]); setVatRate("0.23"); setDiscount("0"); setNotes(""); setEditingQuote(null);
    };
    const openCreateModal = () => { resetForm(); setShowModal(true); };
    const closeModal = () => { setShowModal(false); resetForm(); };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!clientId) return;
        createMutation.mutate({ clientId, quoteDate, validUntil, items, vatRate, discount, notes });
    };

    const handleDelete = (quote: any) => {
        if (confirm(`Delete quote ${quote.quote_number}?`)) deleteMutation.mutate(quote.id);
    };

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const vatAmount = taxable * parseFloat(vatRate);
    const total = taxable + vatAmount;

    const columns: Column<any>[] = [
        { key: "quote_number", header: "Quote #", render: (q) => <strong>{q.quote_number}</strong> },
        { key: "client", header: "Client", render: (q) => q.customers?.name || "—" },
        { key: "created_at", header: "Date", render: (q) => formatDate(q.created_at) },
        { key: "valid_until", header: "Valid Until", render: (q) => q.valid_until ? formatDate(q.valid_until) : "—" },
        { key: "total", header: "Total", render: (q) => <strong>{formatCurrency(q.total)}</strong> },
        {
            key: "status", header: "Status", render: (q) => {
                const s: Record<string, { bg: string; color: string; icon: any }> = {
                    draft: { bg: "#f1f5f9", color: "#64748b", icon: FileText },
                    sent: { bg: "#dbeafe", color: "#2563eb", icon: Clock },
                    accepted: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle },
                    converted: { bg: "#f3e8ff", color: "#9333ea", icon: ArrowRight },
                };
                const style = s[q.status] || s.draft;
                const Icon = style.icon;
                return <span className={styles.statusBadge} style={{ background: style.bg, color: style.color }}><Icon size={12} /> {q.status}</span>;
            }
        },
        { key: "actions", header: "", render: (q) => (
            <div className={styles.actions}>
                <button className={styles.deleteBtn} onClick={() => handleDelete(q)}><Trash2 size={14} /></button>
            </div>
        )}
    ];

    const filtered = quotes.filter((q: any) =>
        q.quote_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Quotes</h1>
                <button className={styles.createBtn} onClick={openCreateModal}><Plus size={18} /> New Quote</button>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Search quotes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading quotes...</div> : <DataTable columns={columns} data={filtered} emptyMessage="No quotes yet. Create your first quote!" />}

            <Modal isOpen={showModal} onClose={closeModal} title={editingQuote ? "Edit Quote" : "Create Quote"} maxWidth={800}
                footer={<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!clientId}>{editingQuote ? "Update Quote" : "Create Quote"}</Button></>}>
                <div className={styles.modalForm}>
                    <div className={styles.formSection}><label className={styles.label}>Client *</label><ClientSelector value={clientId as any} onChange={(id) => setClientId(id as any)} /></div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}><label className={styles.label}>Quote Date</label><input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>Valid Until</label><input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>VAT Rate</label><select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={styles.input}><option value="0">0%</option><option value="0.09">9%</option><option value="0.135">13.5%</option><option value="0.23">23%</option></select></div>
                    </div>
                    <div className={styles.formSection}><label className={styles.label}>Line Items</label><LineItemsEditor items={items} onChange={setItems} /></div>
                    <div className={styles.formRow}><div className={styles.formGroup}><label className={styles.label}>Discount (€)</label><input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className={styles.input} step="0.01" /></div></div>
                    <div className={styles.formSection}><label className={styles.label}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Additional details..." /></div>
                    <div className={styles.totalsBox}>
                        <div className={styles.totalLine}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {discountAmount > 0 && <div className={styles.totalLine}><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
                        <div className={styles.totalLine}><span>VAT ({(parseFloat(vatRate) * 100).toFixed(0)}%)</span><span>{formatCurrency(vatAmount)}</span></div>
                        <div className={styles.totalLineBold}><span>Total</span><span>{formatCurrency(total)}</span></div>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
