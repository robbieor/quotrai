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

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [eircode, setEircode] = useState("");
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);
    const [paymentTerms, setPaymentTerms] = useState("30");
    const [notes, setNotes] = useState("");
    const [isGeocoding, setIsGeocoding] = useState(false);

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
        setAddress("");
        setEircode("");
        setLatitude(null);
        setLongitude(null);
        setPaymentTerms("30");
        setNotes("");
        setEditingClient(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (client: any) => {
        setEditingClient(client);
        setName(client.name || "");
        setEmail(client.email || "");
        setPhone(client.phone || client.mobile || "");
        setAddress(client.address || "");
        setEircode(client.eircode || "");
        setLatitude(client.latitude ? parseFloat(client.latitude) : null);
        setLongitude(client.longitude ? parseFloat(client.longitude) : null);
        setPaymentTerms(client.paymentTerms?.toString() || "30");
        setNotes(client.notes || "");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleEircodeLookup = async () => {
        if (!eircode || eircode.length < 7) return;

        setIsGeocoding(true);
        try {
            const res = await apiRequest("GET", `/api/geocode/eircode/${eircode.toUpperCase()}`);
            const geo = await res.json();
            if (geo) {
                setAddress(prev => prev || geo.formattedAddress);
                setLatitude(geo.latitude);
                setLongitude(geo.longitude);
            }
        } catch (err) {
            console.error("Eircode lookup failed:", err);
        } finally {
            setIsGeocoding(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        const data = {
            name,
            email: email || null,
            phone: phone || null,
            address: address || null,
            eircode: eircode || null,
            latitude: latitude || null,
            longitude: longitude || null,
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
            render: (c) => c.phone ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                    <Phone size={14} /> {c.phone}
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
        c.phone?.includes(searchTerm)
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
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Email</label>
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} placeholder="client@example.com" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Phone</label>
                                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={styles.input} placeholder="Phone number" />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup} style={{ flex: 1 }}>
                                    <label className={styles.label}>Eircode</label>
                                    <div style={{ display: "flex", gap: 8 }}>
                                        <input
                                            type="text"
                                            value={eircode}
                                            onChange={(e) => setEircode(e.target.value.toUpperCase())}
                                            className={styles.input}
                                            placeholder="A12 BC34"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleEircodeLookup}
                                            disabled={isGeocoding || !eircode}
                                            style={{
                                                padding: "0 16px",
                                                background: "var(--color-primary)",
                                                color: "white",
                                                border: "none",
                                                borderRadius: 4,
                                                cursor: "pointer",
                                                fontSize: 13,
                                                whiteSpace: "nowrap"
                                            }}
                                        >
                                            {isGeocoding ? "..." : "Lookup"}
                                        </button>
                                    </div>
                                </div>
                                <div className={styles.formGroup} style={{ flex: 2 }}>
                                    <label className={styles.label}>Address</label>
                                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={styles.input} placeholder="Full address" />
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
