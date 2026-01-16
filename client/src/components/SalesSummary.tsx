import { ChevronRight } from "lucide-react";
import styles from "./SalesSummary.module.css";

interface SummaryItem {
    label: string;
    count: number;
    color: string;
    status: string;
}

interface SummarySectionProps {
    title: string;
    items: SummaryItem[];
    actionLabel: string;
}

function SummarySection({ title, items, actionLabel }: SummarySectionProps) {
    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>{title}</h3>
                <a href="#" className={styles.seeAll}>See all</a>
            </div>
            <div className={styles.itemList}>
                {items.map((item, idx) => (
                    <div key={idx} className={styles.item}>
                        <div className={styles.itemLeft}>
                            <div className={styles.statusDot} style={{ backgroundColor: item.color }} />
                            <span className={styles.label}>{item.label}</span>
                        </div>
                        <div className={styles.itemLeft}>
                            <span className={styles.count}>{item.count}</span>
                            <ChevronRight size={16} className={styles.chevron} />
                        </div>
                    </div>
                ))}
            </div>
            <button className={styles.actionButton}>
                {actionLabel}
            </button>
        </div>
    );
}

interface SalesSummaryProps {
    data: {
        enquiries: SummaryItem[];
        quotes: SummaryItem[];
        invoices: SummaryItem[];
    };
}

export default function SalesSummary({ data }: SalesSummaryProps) {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Sales</h2>
            </div>

            <SummarySection
                title="Enquiries"
                items={data.enquiries}
                actionLabel="New Enquiry"
            />

            <SummarySection
                title="Quotes"
                items={data.quotes}
                actionLabel="New Quote"
            />

            <SummarySection
                title="Invoices"
                items={data.invoices}
                actionLabel="New Invoice"
            />
        </div>
    );
}
