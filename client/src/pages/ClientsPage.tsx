import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, User, X, Trash2, Mail, Phone, MapPin } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Client } from "../types";
import { apiRequest } from "../lib/api";
import styles from "./InvoicesPage.module.css";

export default function ClientsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [mobile, setMobile] = useState("");
    const [contact, setContact] = useState("");
    const [address, setAddress] = useState("");
    const [address2, setAddress2] = useState("");
    const [address3, setAddress3] = useState("");
    const [eircode, setEircode] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("30");
    const [notes, setNotes] = useState("");

    const { data: clients = [], isLoading } = useQuery<Client[]>({
        queryKey: ["/api/clients"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/clients", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/clients/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/clients/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        },
    });

    const resetForm = () => {
        setName("");
        setEmail("");
        setPhone("");
        setMobile("");
        setContact("");
        setAddress("");
        setAddress2("");
        setAddress3("");
        setEircode("");
        setPaymentTerms("30");
        setNotes("");
        setEditingClient(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (client: Client) => {
        setEditingClient(client);
        setName(client.name || "");
        setEmail(client.email || "");
        setPhone(client.phone || "");
        setMobile(client.mobile || "");
        setContact(client.contact || "");
        setAddress(client.address || "");
        setAddress2(client.address2 || "");
        setAddress3(client.address3 || "");
        setEircode(client.eircode || "");
        setPaymentTerms(client.paymentTerms?.toString() || "30");
        setNotes(client.notes || "");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const data = {
            name,
            email: email || null,
            phone: phone || null,
            mobile: mobile || null,
            contact: contact || null,
            address: address || null,
            address2: address2 || null,
            address3: address3 || null,
            eircode: eircode || null,
            paymentTerms: parseInt(paymentTerms) || 30,
            notes: notes || null,
        };

        if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (client: Client) => {
        if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
            deleteMutation.mutate(client.id);
        }
    };

    const columns: Column<Client>[] = [
        {
            key: "name",
            header: "Client",
            render: (c) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                        width: 36, height: 36,
                        background: "linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(99, 102, 241, 0.1))",
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "var(--color-primary)"
                    }}>
                        <User size={16} />
                    </div>
                    <div>
                        <strong>{c.name}</strong>
                        {c.contact && <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.contact}</div>}
                    </div>
                </div>
            )
        },
        {
            key: "email",
            header: "Email",
            render: (c) => c.email ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                    <Mail size={14} /> {c.email}
                </span>
            ) : "—"
        },
        {
            key: "phone",
            header: "Phone",
            render: (c) => (c.phone || c.mobile) ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                    <Phone size={14} /> {c.phone || c.mobile}
                </span>
            ) : "—"
        },
        {
            key: "address",
            header: "Location",
            render: (c) => c.address ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                    <MapPin size={14} /> {c.address}
                </span>
            ) : "—"
        },
        {
            key: "actions", header: "", render: (c) => (
                <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEditModal(c)}>Edit</button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
                </div>
            )
        }
    ];

    const filtered = clients.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.mobile?.includes(searchTerm)
    );

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Clients</h1>
                <button className={styles.createBtn} onClick={openCreateModal}>
                    <Plus size={18} />
                    Add Client
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search clients..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading clients...</div>
            ) : (
                <DataTable columns={columns} data={filtered} emptyMessage="No clients yet. Add your first client!" />
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingClient ? "Edit Client" : "Add Client"}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Client Name *</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} required placeholder="Business or person name" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Contact Person</label>
                                    <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className={styles.input} placeholder="Primary contact" />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} placeholder="client@example.com" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Phone</label>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={styles.input} placeholder="Office phone" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Mobile</label>
                                    <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} className={styles.input} placeholder="Mobile number" />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Address Line 1</label>
                                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={styles.input} placeholder="Street address" />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Address Line 2</label>
                                    <input type="text" value={address2} onChange={(e) => setAddress2(e.target.value)} className={styles.input} placeholder="City/Town" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Address Line 3</label>
                                    <input type="text" value={address3} onChange={(e) => setAddress3(e.target.value)} className={styles.input} placeholder="County" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Eircode</label>
                                    <input type="text" value={eircode} onChange={(e) => setEircode(e.target.value)} className={styles.input} placeholder="A12 BC34" />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Payment Terms (days)</label>
                                    <select value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className={styles.input}>
                                        <option value="0">Due on Receipt</option>
                                        <option value="7">Net 7</option>
                                        <option value="14">Net 14</option>
                                        <option value="30">Net 30</option>
                                        <option value="60">Net 60</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Internal notes about this client..." />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingClient ? "Update Client" : "Add Client"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
