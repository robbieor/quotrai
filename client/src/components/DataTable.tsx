import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./DataTable.module.css";

export interface Column<T> {
    key: string;
    header: string;
    width?: string;
    sortable?: boolean;
    render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
    title?: string;
    columns: Column<T>[];
    data: T[];
    onRowClick?: (row: T) => void;
    pageSize?: number;
    emptyMessage?: string;
}

export default function DataTable<T>({
    title,
    columns,
    data,
    onRowClick,
    pageSize = 10,
    emptyMessage = "No items found"
}: DataTableProps<T>) {
    const [currentPage, setCurrentPage] = useState(1);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const sortedData = [...data].sort((a: any, b: any) => {
        if (!sortKey) return 0;
        if (a[sortKey] < b[sortKey]) return sortOrder === "asc" ? -1 : 1;
        if (a[sortKey] > b[sortKey]) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const totalPages = Math.ceil(data.length / pageSize);
    const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    return (
        <div className={styles.container}>
            {title && (
                <div className={styles.tableHeader}>
                    <h2 className={styles.title}>{title}</h2>
                </div>
            )}

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead className={styles.thead}>
                        <tr className={styles.tr}>
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    className={styles.th}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable && handleSort(col.key)}
                                >
                                    <div className={styles.thContent}>
                                        {col.header}
                                        {col.sortable && sortKey === col.key && (
                                            sortOrder === "asc" ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row: any, idx) => (
                                <tr
                                    key={idx}
                                    className={`${styles.tr} ${onRowClick ? styles.clickable : ""}`}
                                    onClick={() => onRowClick && onRowClick(row)}
                                >
                                    {columns.map((col) => (
                                        <td key={col.key} className={styles.td}>
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length} className={styles.emptyState}>
                                    {emptyMessage}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className={styles.pagination}>
                    <div className={styles.paginationInfo}>
                        Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length}
                    </div>
                    <div className={styles.pageButtons}>
                        <button
                            className={styles.pageButton}
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                className={`${styles.pageButton} ${currentPage === page ? styles.pageButtonActive : ""}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                        <button
                            className={styles.pageButton}
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
