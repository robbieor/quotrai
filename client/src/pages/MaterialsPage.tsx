import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Package, X } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Material } from "../types";
import { apiRequest } from "../lib/api";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
    }).format(num || 0);
};

export default function MaterialsPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    // Form state
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("General");
    const [unit, setUnit] = useState("each");
    const [unitPrice, setUnitPrice] = useState("0");

    const { data: materials = [], isLoading } = useQuery<Material[]>({
        queryKey: ["/api/materials"],
    });

    const createMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/materials", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/materials"] });
            closeModal();
        },
    });

    const closeModal = () => {
        setShowCreateModal(false);
        setName("");
        setDescription("");
        setCategory("General");
        setUnit("each");
        setUnitPrice("0");
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        createMutation.mutate({
            name,
            description,
            category,
            unit,
            unitPrice: parseFloat(unitPrice) || 0,
        });
    };

    const filteredMaterials = materials.filter((material) => {
        return (
            material.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            material.category?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    });

    const columns: Column<Material>[] = [
        {
            key: "name",
            header: "Material",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: "8px",
                        background: "#dbeafe",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        <Package size={16} color="#3b82f6" />
                    </div>
                    <span style={{ fontWeight: 500 }}>{row.name}</span>
                </div>
            ),
            sortable: true,
        },
        {
            key: "description",
            header: "Description",
            render: (row) => row.description || "—",
        },
        {
            key: "category",
            header: "Category",
            render: (row) => (
                <span className={styles.statusBadge} style={{ backgroundColor: "#f1f5f9", color: "#475569" }}>
                    {row.category || "General"}
                </span>
            ),
            sortable: true,
            width: "130px",
        },
        {
            key: "unit",
            header: "Unit",
            render: (row) => row.unit,
            sortable: true,
            width: "100px",
        },
        {
            key: "unitPrice",
            header: "Unit Price",
            render: (row) => <strong>{formatCurrency(row.unitPrice)}</strong>,
            sortable: true,
            width: "120px",
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Materials</h1>
                    <p className={styles.subtitle}>Manage your material inventory and pricing</p>
                </div>
                <button className={styles.createBtn} onClick={() => setShowCreateModal(true)}>
                    <Plus size={20} />
                    Add Material
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.stats}>
                    <span className={styles.stat}>
                        <strong>{materials.length}</strong> Materials
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading materials...</div>
            ) : (
                <DataTable<Material>
                    columns={columns}
                    data={filteredMaterials}
                    emptyMessage="No materials yet. Add your first material!"
                />
            )}

            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Add New Material</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleSubmit} className={styles.modalForm}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Material Name *</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={styles.input} required placeholder="e.g. Copper Pipe" />
                            </div>

                            <div className={styles.formGroup}>
                                <label className={styles.label}>Description</label>
                                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={styles.textarea} rows={2} placeholder="Optional details..." />
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Category</label>
                                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} className={styles.input} placeholder="e.g. Plumbing" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Unit</label>
                                    <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={styles.input} placeholder="e.g. meter, each" />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Unit Price (€)</label>
                                    <input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className={styles.input} step="0.01" />
                                </div>
                            </div>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!name.trim() || createMutation.isPending}>
                                    {createMutation.isPending ? "Adding..." : "Add Material"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
