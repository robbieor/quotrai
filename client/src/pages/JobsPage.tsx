import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, MapPin, Calendar, X, Trash2, Edit } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Job } from "../types";
import { apiRequest } from "../lib/api";
import ClientSelector from "../components/ClientSelector";
import styles from "./InvoicesPage.module.css";

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

interface JobWithClient extends Job {
    client?: { id: number; name: string; address?: string; eircode?: string } | null;
    clientName?: string;
    clientAddress?: string;
}

export default function JobsPage() {
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState<JobWithClient | null>(null);

    useEffect(() => {
        if (searchParams.get("action") === "new") {
            setShowModal(true);
            const newParams = new URLSearchParams(searchParams);
            newParams.delete("action");
            setSearchParams(newParams, { replace: true });
        }
    }, [searchParams]);

    // Form state
    const [title, setTitle] = useState("");
    const [clientId, setClientId] = useState<number | null>(null);
    const [date, setDate] = useState("");
    const [startTime, setStartTime] = useState("");
    const [estimatedDuration, setEstimatedDuration] = useState("");
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState("scheduled");

    const { data: jobs = [], isLoading } = useQuery<JobWithClient[]>({
        queryKey: ["/api/jobs"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/jobs", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/jobs/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/jobs/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
        },
    });

    const resetForm = () => {
        setTitle("");
        setClientId(null);
        setSelectedClient(null);
        setDate("");
        setStartTime("");
        setEstimatedDuration("");
        setDescription("");
        setStatus("scheduled");
        setEditingJob(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (job: JobWithClient) => {
        setEditingJob(job);
        setTitle(job.title || "");
        setClientId(job.clientId || null);
        setSelectedClient(job.client || { name: job.clientName, address: job.clientAddress });
        setDate(job.date?.split("T")[0] || "");
        setStartTime(job.startTime || "");
        setEstimatedDuration(job.estimatedDuration || "");
        setDescription(job.description || "");
        setStatus(job.status || "scheduled");
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !clientId) return;

        const data = {
            title,
            clientId,
            date: date ? new Date(date).toISOString() : new Date().toISOString(),
            startTime: startTime || null,
            estimatedDuration: estimatedDuration || null,
            description: description || null,
            status,
        };

        if (editingJob) {
            updateMutation.mutate({ id: editingJob.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (job: JobWithClient) => {
        if (confirm(`Delete job "${job.title || (job as any).name}"? This cannot be undone.`)) {
            deleteMutation.mutate(job.id);
        }
    };

    const filteredJobs = jobs.filter((job) => {
        return (
            (job.title || (job as any).name)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const columns: Column<JobWithClient>[] = [
        {
            key: "title",
            header: "Job Title",
            render: (row) => <span style={{ fontWeight: 500, color: "#1e293b" }}>{row.title || (row as any).name}</span>,
        },
        {
            key: "client",
            header: "Client",
            render: (row) => row.client?.name || row.clientName || "—",
        },
        {
            key: "location",
            header: "Location",
            render: (row) => (row.client?.address || row.clientAddress) ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-secondary)", fontSize: "13px" }}>
                    <MapPin size={12} />
                    <span style={{
                        maxWidth: "200px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                    }}>
                        {row.client?.address || row.clientAddress}
                    </span>
                </div>
            ) : "—",
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
        },
        {
            key: "status",
            header: "Status",
            render: (row) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    in_progress: { bg: "#dcfce7", text: "#166534" },
                    completed: { bg: "#dbeafe", text: "#1d4ed8" },
                    scheduled: { bg: "#fef3c7", text: "#92400e" },
                    cancelled: { bg: "#fee2e2", text: "#991b1b" },
                };
                const style = colors[row.status] || { bg: "#f1f5f9", text: "#475569" };
                const label = row.status === 'in_progress' ? 'In Progress' : (row.status?.charAt(0).toUpperCase() + row.status?.slice(1)) || "Scheduled";
                return (
                    <span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>
                        {label}
                    </span>
                );
            },
        },
        {
            key: "actions",
            header: "",
            render: (row) => (
                <div className={styles.actions}>
                    <button className={styles.editBtn} onClick={() => openEditModal(row)}><Edit size={14} /></button>
                    <button className={styles.deleteBtn} onClick={() => handleDelete(row)}><Trash2 size={14} /></button>
                </div>
            ),
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Jobs</h1>
                <button className={styles.createBtn} onClick={openCreateModal}>
                    <Plus size={18} />
                    New Job
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                        <strong>{jobs.length}</strong> Total
                    </span>
                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                        <strong>{jobs.filter(j => j.status === "scheduled" || j.status === "in_progress").length}</strong> Active/Scheduled
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading jobs...</div>
            ) : (
                <DataTable columns={columns} data={filteredJobs} emptyMessage="No jobs yet. Create your first job!" />
            )}

            {showModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{editingJob ? "Edit Job" : "Create Job"}</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Job Title *</label>
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={styles.input} required placeholder="e.g. Kitchen Renovation" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.input}>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Client *</label>
                                <ClientSelector value={clientId} onChange={(id, client) => {
                                    setClientId(id);
                                    setSelectedClient(client);
                                }} />
                                {selectedClient && selectedClient.address && (
                                    <div style={{
                                        marginTop: "8px",
                                        padding: "8px 12px",
                                        background: "#f8fafc",
                                        borderRadius: "6px",
                                        border: "1px solid #e2e8f0",
                                        fontSize: "13px",
                                        color: "#64748b",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px"
                                    }}>
                                        <MapPin size={14} />
                                        <span>{selectedClient.address} {selectedClient.eircode ? `(${selectedClient.eircode})` : ""}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Date *</label>
                                    <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={styles.input} required />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Start Time</label>
                                    <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Est. Duration</label>
                                    <input type="text" value={estimatedDuration} onChange={(e) => setEstimatedDuration(e.target.value)} className={styles.input} placeholder="e.g. 2 hours" />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Description / Notes</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} rows={3} placeholder="Additional details..." />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!title.trim() || !clientId || createMutation.isPending || updateMutation.isPending}>
                                    {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingJob ? "Update Job" : "Create Job"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
