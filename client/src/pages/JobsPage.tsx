import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MapPin, Calendar, X, Trash2, Edit } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import ClientSelector from "../components/ClientSelector";
import styles from "./InvoicesPage.module.css";

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" });
};

export default function JobsPage() {
    const queryClient = useQueryClient();
    const { teamId } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState<any>(null);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    const [title, setTitle] = useState("");
    const [clientId, setClientId] = useState<string | null>(null);
    const [date, setDate] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("pending");

    const { data: jobs = [], isLoading } = useQuery({
        queryKey: ["jobs", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("jobs")
                .select("*, customers(name, address)")
                .eq("team_id", teamId)
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const { error } = await supabase.from("jobs").insert({
                team_id: teamId!,
                customer_id: data.clientId,
                title: data.title,
                description: data.description || null,
                scheduled_date: data.date || null,
                status: data.status,
            });
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); closeModal(); },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const { error } = await supabase.from("jobs").update({
                title: data.title,
                customer_id: data.clientId,
                description: data.description || null,
                scheduled_date: data.date || null,
                status: data.status,
            }).eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); closeModal(); },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("jobs").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs"] }); },
    });

    const resetForm = () => { setTitle(""); setClientId(null); setDate(""); setDescription(""); setStatus("pending"); setEditingJob(null); };
    const openCreateModal = () => { resetForm(); setShowModal(true); };
    const openEditModal = (job: any) => {
        setEditingJob(job); setTitle(job.title || ""); setClientId(job.customer_id || null);
        setDate(job.scheduled_date || ""); setDescription(job.description || ""); setStatus(job.status || "pending"); setShowModal(true);
    };
    const closeModal = () => { setShowModal(false); resetForm(); };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !clientId) return;
        const data = { title, clientId, date: date || null, description, status };
        if (editingJob) { updateMutation.mutate({ id: editingJob.id, data }); } else { createMutation.mutate(data); }
    };

    const handleDelete = (job: any) => {
        if (confirm(`Delete job "${job.title}"? This cannot be undone.`)) deleteMutation.mutate(job.id);
    };

    const columns: Column<any>[] = [
        { key: "title", header: "Job Title", render: (row) => <span style={{ fontWeight: 500, color: "#1e293b" }}>{row.title}</span> },
        { key: "client", header: "Client", render: (row) => row.customers?.name || "—" },
        { key: "location", header: "Location", render: (row) => row.customers?.address ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontSize: "13px" }}>
                <MapPin size={12} /><span style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.customers.address}</span>
            </div>
        ) : "—" },
        { key: "scheduled_date", header: "Date", render: (row) => <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}><Calendar size={14} />{formatDate(row.scheduled_date)}</div> },
        { key: "status", header: "Status", render: (row) => {
            const colors: Record<string, { bg: string; text: string }> = {
                in_progress: { bg: "#dcfce7", text: "#166534" }, completed: { bg: "#dbeafe", text: "#1d4ed8" },
                pending: { bg: "#fef3c7", text: "#92400e" }, scheduled: { bg: "#fef3c7", text: "#92400e" }, cancelled: { bg: "#fee2e2", text: "#991b1b" },
            };
            const style = colors[row.status] || { bg: "#f1f5f9", text: "#475569" };
            const label = row.status === 'in_progress' ? 'In Progress' : (row.status?.charAt(0).toUpperCase() + row.status?.slice(1)) || "Pending";
            return <span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>{label}</span>;
        }},
        { key: "actions", header: "", render: (row) => (
            <div className={styles.actions}>
                <button className={styles.editBtn} onClick={() => openEditModal(row)}><Edit size={14} /></button>
                <button className={styles.deleteBtn} onClick={() => handleDelete(row)}><Trash2 size={14} /></button>
            </div>
        )},
    ];

    const filteredJobs = jobs.filter((job: any) => job.title?.toLowerCase().includes(searchTerm.toLowerCase()) || job.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase()));

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Jobs</h1>
                <button className={styles.createBtn} onClick={openCreateModal}><Plus size={18} /> New Job</button>
            </div>
            <div className={styles.toolbar}>
                <div className={styles.searchBox}><Search size={18} /><input type="text" placeholder="Search jobs..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading jobs...</div> : <DataTable columns={columns} data={filteredJobs} emptyMessage="No jobs yet. Create your first job!" />}

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}><h2>{editingJob ? "Edit Job" : "Create Job"}</h2><button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button></div>
                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}><label className={styles.label}>Job Title *</label><input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} required placeholder="e.g. Kitchen Renovation" /></div>
                                <div className={styles.formGroup}><label className={styles.label}>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.input}><option value="pending">Pending</option><option value="scheduled">Scheduled</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div>
                            </div>
                            <div className={styles.formSection}><label className={styles.label}>Client *</label><ClientSelector value={clientId as any} onChange={(id) => setClientId(id as any)} /></div>
                            <div className={styles.formGroup}><label className={styles.label}>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} /></div>
                            <div className={styles.formSection}><label className={styles.label}>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} rows={3} placeholder="Additional details..." /></div>
                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!title.trim() || !clientId || createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "Saving..." : editingJob ? "Update Job" : "Create Job"}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
