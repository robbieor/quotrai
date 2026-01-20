import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Package } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import type { Material } from "../types";
import styles from "./InvoicesPage.module.css";

const formatCurrency = (amount: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
    }).format(num);
};

export default function MaterialsPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [showCreateModal, setShowCreateModal] = useState(false);

    const { data: materials = [], isLoading } = useQuery<Material[]>({
        queryKey: ["/api/materials"],
    });

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
                <button className={styles.createButton} onClick={() => setShowCreateModal(true)}>
                    <Plus size={20} />
                    Add Material
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="Search materials..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
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
                    title=""
                    columns={columns}
                    data={filteredMaterials}
                    pageSize={10}
                />
            )}

            {showCreateModal && (
                <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <h2>Add New Material</h2>
                        <p style={{ color: "#64748b", marginBottom: "24px" }}>
                            Material form coming soon. This will include pricing, categories, and unit settings.
                        </p>
                        <button className={styles.cancelButton} onClick={() => setShowCreateModal(false)}>
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
