import { useState } from "react";
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
    client?: { id: number; name: string } | null;
}

export default function JobsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingJob, setEditingJob] = useState<JobWithClient | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [clientId, setClientId] = useState<number | null>(null);
    const [address, setAddress] = useState("");
    const [eircode, setEircode] = useState("");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [budgetedHours, setBudgetedHours] = useState("");
    const [defaultHourlyRate, setDefaultHourlyRate] = useState("");
    const [notes, setNotes] = useState("");
    const [status, setStatus] = useState("active");

    const { data: jobs = [], isLoading } = useQuery<JobWithClient[]>({
        queryKey: ["/api/job-sites"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/job-sites", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/job-sites"] });
            closeModal();
        },
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }: { id: number; data: any }) => {
            const res = await apiRequest("PUT", `/api/job-sites/${id}`, data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/job-sites"] });
            closeModal();
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("DELETE", `/api/job-sites/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/job-sites"] });
        },
    });

    const resetForm = () => {
        setName("");
        setClientId(null);
        setAddress("");
        setEircode("");
        setStartDate("");
        setEndDate("");
        setBudgetedHours("");
        setDefaultHourlyRate("");
        setNotes("");
        setStatus("active");
        setEditingJob(null);
    };

    const openCreateModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (job: JobWithClient) => {
        setEditingJob(job);
        setName(job.name || "");
        setClientId(job.clientId || null);
        setAddress(job.address || "");
        setEircode((job as any).eircode || "");
        setStartDate(job.startDate?.split("T")[0] || "");
        setEndDate(job.endDate?.split("T")[0] || "");
        setBudgetedHours((job as any).budgetedHours || "");
        setDefaultHourlyRate((job as any).defaultHourlyRate || "");
        setNotes((job as any).notes || "");
        setStatus(job.status || "active");
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
            clientId: clientId || null,
            address: address || null,
            eircode: eircode || null,
            startDate: startDate || null,
            endDate: endDate || null,
            budgetedHours: budgetedHours ? parseFloat(budgetedHours) : null,
            defaultHourlyRate: defaultHourlyRate ? parseFloat(defaultHourlyRate) : null,
            notes: notes || null,
            status,
        };

        if (editingJob) {
            updateMutation.mutate({ id: editingJob.id, data });
        } else {
            createMutation.mutate(data);
        }
    };

    const handleDelete = (job: JobWithClient) => {
        if (confirm(`Delete job "${job.name}"? This cannot be undone.`)) {
            deleteMutation.mutate(job.id);
        }
    };

    const filteredJobs = jobs.filter((job) => {
        return (
            job.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            job.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const columns: Column<JobWithClient>[] = [
        {
            key: "name",
            header: "Job Name",
            render: (row) => <span style={{ fontWeight: 500, color: "#1e293b" }}>{row.name}</span>,
        },
        {
            key: "client",
            header: "Client",
            render: (row) => row.client?.name || "—",
        },
        {
            key: "address",
            header: "Location",
            render: (row) => row.address ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <MapPin size={14} />
                    <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.address}
                    </span>
                </div>
            ) : "—",
        },
        {
            key: "startDate",
            header: "Start Date",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <Calendar size={14} />
                    {formatDate(row.startDate)}
                </div>
            ),
        },
        {
            key: "status",
            header: "Status",
            render: (row) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    active: { bg: "#dcfce7", text: "#166534" },
                    completed: { bg: "#dbeafe", text: "#1d4ed8" },
                    pending: { bg: "#fef3c7", text: "#92400e" },
                    cancelled: { bg: "#fee2e2", text: "#991b1b" },
                };
                const style = colors[row.status] || { bg: "#f1f5f9", text: "#475569" };
                return (
                    <span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>
                        {row.status || "pending"}
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
                        <strong>{jobs.filter(j => j.status === "active").length}</strong> Active
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
                                    <label className={styles.label}>Job Name *</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} required placeholder="e.g. Kitchen Renovation" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Status</label>
                                    <select value={status} onChange={(e) => setStatus(e.target.value)} className={styles.input}>
                                        <option value="pending">Pending</option>
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Client</label>
                                <ClientSelector value={clientId} onChange={(id) => setClientId(id)} />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Address</label>
                                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={styles.input} placeholder="Job site address" />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Eircode</label>
                                    <input type="text" value={eircode} onChange={(e) => setEircode(e.target.value)} className={styles.input} placeholder="A12 BC34" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Start Date</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={styles.input} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>End Date</label>
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={styles.input} />
                                </div>
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Budgeted Hours</label>
                                    <input type="number" value={budgetedHours} onChange={(e) => setBudgetedHours(e.target.value)} className={styles.input} placeholder="40" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Hourly Rate (€)</label>
                                    <input type="number" value={defaultHourlyRate} onChange={(e) => setDefaultHourlyRate(e.target.value)} className={styles.input} placeholder="50" step="0.01" />
                                </div>
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Notes</label>
                                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={styles.textarea} rows={3} placeholder="Additional details..." />
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!name.trim() || createMutation.isPending || updateMutation.isPending}>
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
