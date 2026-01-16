import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import styles from "./MetricCard.module.css";

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    iconColor?: string;
    iconBg?: string;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    subtitle?: string;
    onClick?: () => void;
}

export default function MetricCard({
    title,
    value,
    icon: Icon,
    iconColor = "#0d9488",
    iconBg = "rgba(13, 148, 136, 0.1)",
    trend,
    subtitle,
    onClick
}: MetricCardProps) {
    return (
        <div className={styles.card} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <div className={styles.iconWrapper} style={{ backgroundColor: iconBg }}>
                    <Icon size={18} color={iconColor} />
                </div>
            </div>

            <div className={styles.value}>{value}</div>

            <div className={styles.footer}>
                {trend ? (
                    <>
                        <div className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
                            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {trend.isPositive ? "+" : "-"}{trend.value}%
                        </div>
                        <span className={styles.trendLabel}>{trend.label}</span>
                    </>
                ) : (
                    <span className={styles.subtitle}>{subtitle}</span>
                )}
            </div>
        </div>
    );
}
