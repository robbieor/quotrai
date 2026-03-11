import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, User, Trash2, Mail, Phone, MapPin, X } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

interface ClientRow {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    postal_code: string | null;
    notes: string | null;
    contact_person: string | null;
}

export default function ClientsPage() {
    const queryClient = useQueryClient();
    const { teamId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<ClientRow | null>(null);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [notes, setNotes] = useState("");

    const { data: clients = [], isLoading } = useQuery({
        queryKey: ["clients", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("customers")
                .select("*")
                .eq("team_id", teamId)
                .order("name");
            if (error) throw error;
            return (data || []) as ClientRow[];
        },
        enabled: !!teamId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: Partial<ClientRow>) => {
            const { error } = await supabase.from("customers").insert({ ...data, team_id: teamId! });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeModal(); },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ClientRow> }) => {
            const { error } = await supabase.from("customers").update(data).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); closeModal(); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("customers").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); },
    });

    const resetForm = () => { setName(""); setEmail(""); setPhone(""); setAddress(""); setNotes(""); setEditingClient(null); };
    const openCreateModal = () => { resetForm(); setShowModal(true); };
    const openEditModal = (client: ClientRow) => {
        setEditingClient(client);
        setName(client.name || "");
        setEmail(client.email || "");
        setPhone(client.phone || "");
        setAddress(client.address || "");
        setNotes(client.notes || "");
        setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); resetForm(); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        const data = { name, email: email || null, phone: phone || null, address: address || null, notes: notes || null };
        if (editingClient) {
            updateMutation.mutate({ id: editingClient.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (client: ClientRow) => {
        if (confirm(`Delete ${client.name}? This cannot be undone.`)) {
            deleteMutation.mutate(client.id);
        }
    };

    const columns: Column<ClientRow>[] = [
        {
            key: "name", header: "Client",
            render: (c) => (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, rgba(13, 148, 136, 0.1), rgba(99, 102, 241, 0.1))", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-primary)" }}>
                        <User size={16} />
                    </div>
                    <strong>{c.name}</strong>
                </div>
            )
        },
        { key: "email", header: "Email", render: (c) => c.email ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}><Mail size={14} /> {c.email}</span> : "—" },
        { key: "phone", header: "Phone", render: (c) => c.phone ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}><Phone size={14} /> {c.phone}</span> : "—" },
        { key: "address", header: "Location", render: (c) => c.address ? <span style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}><MapPin size={14} /> {c.address}</span> : "—" },
        { key: "actions", header: "", render: (c) => (
            <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => openEditModal(c)}>Edit</button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(c)}><Trash2 size={14} /></button>
            </div>
        )}
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
                <button className={styles.createBtn} onClick={openCreateModal}><Plus size={18} /> Add Client</button>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Search clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading clients...</div> : <DataTable columns={columns} data={filtered} emptyMessage="No clients yet. Add your first client!" />}

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingClient ? "Edit Client" : "Add Client"}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formGroup}><label className={styles.label}>Client Name *</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} required placeholder="Business or person name" /></div>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.label}>Email</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={styles.input} placeholder="client@example.com" /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={styles.input} placeholder="Phone number" /></div>
                            </div>
                            <div className={styles.formGroup}><label className={styles.label}>Address</label><input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={styles.input} placeholder="Full address" /></div>
                            <div className={styles.formSection}><label className={styles.label}>Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Internal notes about this client..." /></div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "Saving..." : editingClient ? "Update Client" : "Add Client"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
