import styles from "./Skeleton.module.css";

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: "text" | "circular" | "rectangular" | "rounded";
    className?: string;
    animation?: "pulse" | "shimmer" | "none";
}

export default function Skeleton({
    width,
    height,
    variant = "text",
    className = "",
    animation = "shimmer",
}: SkeletonProps) {
    const style: React.CSSProperties = {
        width: width ?? (variant === "text" ? "100%" : undefined),
        height: height ?? (variant === "text" ? "1em" : undefined),
    };

    return (
        <div
            className={`${styles.skeleton} ${styles[variant]} ${styles[animation]} ${className}`}
            style={style}
            aria-hidden="true"
        />
    );
}

// Pre-built skeleton patterns for common use cases
export function SkeletonMetricCard() {
    return (
        <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
                <Skeleton variant="text" width="60%" height={14} />
                <Skeleton variant="rounded" width={44} height={44} />
            </div>
            <Skeleton variant="text" width="80%" height={32} />
            <Skeleton variant="text" width="50%" height={14} />
        </div>
    );
}

export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
    return (
        <div className={styles.tableRow}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} variant="text" height={16} width={`${60 + Math.random() * 30}%`} />
            ))}
        </div>
    );
}

export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className={styles.table}>
            <div className={styles.tableHeader}>
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} variant="text" height={14} width="70%" />
                ))}
            </div>
            {Array.from({ length: rows }).map((_, i) => (
                <SkeletonTableRow key={i} columns={columns} />
            ))}
        </div>
    );
}

export function SkeletonActivityItem() {
    return (
        <div className={styles.activityItem}>
            <Skeleton variant="rounded" width={44} height={44} />
            <div className={styles.activityContent}>
                <Skeleton variant="text" width="70%" height={14} />
                <Skeleton variant="text" width="40%" height={12} />
            </div>
            <Skeleton variant="rounded" width={60} height={24} />
        </div>
    );
}

export function SkeletonSalesSummary() {
    return (
        <div className={styles.salesSummary}>
            <div className={styles.salesHeader}>
                <Skeleton variant="text" width={120} height={18} />
            </div>
            <div className={styles.salesSection}>
                <Skeleton variant="text" width={80} height={12} />
                <div className={styles.salesItems}>
                    <Skeleton variant="rounded" width="100%" height={36} />
                    <Skeleton variant="rounded" width="100%" height={36} />
                </div>
            </div>
            <div className={styles.salesSection}>
                <Skeleton variant="text" width={60} height={12} />
                <div className={styles.salesItems}>
                    <Skeleton variant="rounded" width="100%" height={36} />
                    <Skeleton variant="rounded" width="100%" height={36} />
                </div>
            </div>
        </div>
    );
}
