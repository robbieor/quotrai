import { TrendingUp, TrendingDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import AnimatedNumber, { AnimatedCurrency, AnimatedPercentage } from "./AnimatedNumber";
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
    animationType?: "none" | "number" | "currency" | "percentage";
}

// Helper to parse currency string to number
const parseCurrencyValue = (value: string | number): number => {
    if (typeof value === "number") return value;
    // Remove currency symbols, commas, and parse
    const cleaned = value.replace(/[€$£,]/g, "").trim();
    return parseFloat(cleaned) || 0;
};

export default function MetricCard({
    title,
    value,
    icon: Icon,
    iconColor = "#0d9488",
    iconBg = "rgba(13, 148, 136, 0.1)",
    trend,
    subtitle,
    onClick,
    animationType = "none"
}: MetricCardProps) {

    // Determine animation type from value format if not specified
    const detectAnimationType = (): "none" | "number" | "currency" | "percentage" => {
        if (animationType !== "none") return animationType;
        if (typeof value === "string") {
            if (value.includes("€") || value.includes("$") || value.includes("£")) return "currency";
            if (value.includes("%")) return "percentage";
        }
        if (typeof value === "number") return "number";
        return "none";
    };

    const type = detectAnimationType();
    const numericValue = parseCurrencyValue(value);

    const renderValue = () => {
        switch (type) {
            case "currency":
                return <AnimatedCurrency value={numericValue} duration={1200} />;
            case "percentage":
                return <AnimatedPercentage value={numericValue} duration={1000} />;
            case "number":
                return <AnimatedNumber value={numericValue} duration={1000} />;
            default:
                return value;
        }
    };

    return (
        <div className={styles.card} onClick={onClick} style={{ cursor: onClick ? "pointer" : "default" }}>
            <div className={styles.header}>
                <span className={styles.title}>{title}</span>
                <div className={styles.iconWrapper} style={{ backgroundColor: iconBg }}>
                    <Icon size={18} color={iconColor} />
                </div>
            </div>

            <div className={styles.value}>{renderValue()}</div>

            <div className={styles.footer}>
                {trend ? (
                    <>
                        <div className={`${styles.trend} ${trend.isPositive ? styles.positive : styles.negative}`}>
                            {trend.isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {trend.isPositive ? "+" : "-"}<AnimatedNumber value={trend.value} duration={800} suffix="%" />
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
