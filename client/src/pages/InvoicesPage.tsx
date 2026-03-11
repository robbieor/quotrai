import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, FileText, Send, CheckCircle, XCircle, Trash2 } from "lucide-react";
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

export default function InvoicesPage() {
    const queryClient = useQueryClient();
    const { teamId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingInvoice, setEditingInvoice] = useState<any>(null);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const [clientId, setClientId] = useState<string | null>(null);
    const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
    const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().split("T")[0]; });
    const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: "1", rate: "0", amount: "0" }]);
    const [vatRate, setVatRate] = useState("0.23");
    const [discount, setDiscount] = useState("0");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState<"draft" | "sent" | "paid">("draft");

    const { data: invoices = [], isLoading } = useQuery({
        queryKey: ["invoices", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("invoices")
                .select("*, customers(name)")
                .eq("team_id", teamId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            // Generate invoice number
            const count = invoices.length + 1;
            const invoiceNumber = `INV-${String(count).padStart(4, "0")}`;
            const subtotal = data.items.reduce((s: number, i: LineItem) => s + (parseFloat(i.amount) || 0), 0);
            const discountAmt = parseFloat(data.discount) || 0;
            const taxable = Math.max(0, subtotal - discountAmt);
            const taxAmt = taxable * parseFloat(data.vatRate);
            const total = taxable + taxAmt;

            const { data: inv, error } = await supabase.from("invoices").insert({
                team_id: teamId!,
                customer_id: data.clientId,
                invoice_number: invoiceNumber,
                issue_date: data.invoiceDate,
                due_date: data.dueDate,
                status: data.status,
                notes: data.notes || null,
                subtotal,
                tax_rate: parseFloat(data.vatRate) * 100,
                tax_amount: taxAmt,
                discount_value: discountAmt,
                total,
            }).select().single();
            if (error) throw error;

            // Insert line items
            if (inv && data.items.length > 0) {
                const lineItems = data.items.filter((i: LineItem) => i.description.trim()).map((i: LineItem) => ({
                    invoice_id: inv.id,
                    description: i.description,
                    quantity: parseFloat(i.quantity) || 1,
                    unit_price: parseFloat(i.rate) || 0,
                    total_price: parseFloat(i.amount) || 0,
                }));
                if (lineItems.length > 0) {
                    const { error: itemsError } = await supabase.from("invoice_items").insert(lineItems);
                    if (itemsError) throw itemsError;
                }
            }
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); closeModal(); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            await supabase.from("invoice_items").delete().eq("invoice_id", id);
            const { error } = await supabase.from("invoices").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["invoices"] }); },
    });

    const resetForm = () => {
        setClientId(null); setInvoiceDate(new Date().toISOString().split("T")[0]);
        const d = new Date(); d.setDate(d.getDate() + 30); setDueDate(d.toISOString().split("T")[0]);
        setItems([{ description: "", quantity: "1", rate: "0", amount: "0" }]); setVatRate("0.23"); setDiscount("0"); setNotes(""); setStatus("draft"); setEditingInvoice(null);
    };
    const openCreateModal = () => { resetForm(); setShowModal(true); };
    const closeModal = () => { setShowModal(false); resetForm(); };

    const handleSubmit = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!clientId) return;
        createMutation.mutate({ clientId, invoiceDate, dueDate, items, vatRate, discount, notes, status });
    };

    const handleDelete = (invoice: any) => {
        if (confirm(`Delete invoice ${invoice.invoice_number}?`)) deleteMutation.mutate(invoice.id);
    };

    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    const discountAmount = parseFloat(discount) || 0;
    const taxable = Math.max(0, subtotal - discountAmount);
    const vatAmount = taxable * parseFloat(vatRate);
    const total = taxable + vatAmount;

    const columns: Column<any>[] = [
        { key: "invoice_number", header: "Invoice #", render: (inv) => <strong>{inv.invoice_number}</strong> },
        { key: "client", header: "Client", render: (inv) => inv.customers?.name || "—" },
        { key: "issue_date", header: "Date", render: (inv) => formatDate(inv.issue_date) },
        { key: "due_date", header: "Due", render: (inv) => formatDate(inv.due_date) },
        { key: "total", header: "Total", render: (inv) => <strong>{formatCurrency(inv.total)}</strong> },
        {
            key: "status", header: "Status", render: (inv) => {
                const s: Record<string, { bg: string; color: string; icon: any }> = {
                    draft: { bg: "#f1f5f9", color: "#64748b", icon: FileText },
                    sent: { bg: "#dbeafe", color: "#2563eb", icon: Send },
                    paid: { bg: "#dcfce7", color: "#16a34a", icon: CheckCircle },
                    overdue: { bg: "#fee2e2", color: "#dc2626", icon: XCircle },
                };
                const style = s[inv.status] || s.draft;
                const Icon = style.icon;
                return <span className={styles.statusBadge} style={{ background: style.bg, color: style.color }}><Icon size={12} /> {inv.status}</span>;
            }
        },
        { key: "actions", header: "", render: (inv) => (
            <div className={styles.actions}>
                <button className={styles.deleteBtn} onClick={() => handleDelete(inv)}><Trash2 size={14} /></button>
            </div>
        )}
    ];

    const filtered = invoices.filter((inv: any) =>
        inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inv.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Invoices</h1>
                <button className={styles.createBtn} onClick={openCreateModal}><Plus size={18} /> New Invoice</button>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading invoices...</div> : <DataTable columns={columns} data={filtered} emptyMessage="No invoices yet. Create your first invoice!" />}

            <Modal isOpen={showModal} onClose={closeModal} title={editingInvoice ? "Edit Invoice" : "Create Invoice"} maxWidth={800}
                footer={<><Button variant="secondary" onClick={closeModal}>Cancel</Button><Button onClick={handleSubmit} loading={createMutation.isPending} disabled={!clientId}>{editingInvoice ? "Update Invoice" : "Create Invoice"}</Button></>}>
                <div className={styles.modalForm}>
                    <div className={styles.formSection}><label className={styles.label}>Client *</label><ClientSelector value={clientId as any} onChange={(id) => setClientId(id as any)} /></div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}><label className={styles.label}>Invoice Date</label><input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>Due Date</label><input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={styles.input} /></div>
                        <div className={styles.formGroup}><label className={styles.label}>Status</label><select value={status} onChange={(e) => setStatus(e.target.value as any)} className={styles.input}><option value="draft">Draft</option><option value="sent">Sent</option><option value="paid">Paid</option></select></div>
                    </div>
                    <div className={styles.formSection}><label className={styles.label}>Line Items</label><LineItemsEditor items={items} onChange={setItems} /></div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}><label className={styles.label}>Discount (€)</label><input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className={styles.input} step="0.01" /></div>
                        <div className={styles.formGroup}><label className={styles.label}>VAT Rate</label><select value={vatRate} onChange={(e) => setVatRate(e.target.value)} className={styles.input}><option value="0">0%</option><option value="0.09">9%</option><option value="0.135">13.5%</option><option value="0.23">23%</option></select></div>
                    </div>
                    <div className={styles.formSection}><label className={styles.label}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Payment terms, additional info..." /></div>
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
