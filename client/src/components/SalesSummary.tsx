import { useNavigate } from "react-router-dom";
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
    viewAllPath: string;
    onAction: () => void;
    onItemClick: (status: string) => void;
}

function SummarySection({ title, items, actionLabel, viewAllPath, onAction, onItemClick }: SummarySectionProps) {
    const navigate = useNavigate();

    return (
        <div className={styles.section}>
            <div className={styles.sectionHeader}>
                <h3 className={styles.sectionTitle}>{title}</h3>
                <a
                    href={viewAllPath}
                    className={styles.seeAll}
                    onClick={(e) => {
                        e.preventDefault();
                        navigate(viewAllPath);
                    }}
                >
                    See all
                </a>
            </div>
            <div className={styles.itemList}>
                {items.map((item, idx) => {
                    const maxCount = Math.max(...items.map(i => i.count), 1);
                    const percentage = (item.count / maxCount) * 100;

                    return (
                        <div
                            key={idx}
                            className={styles.item}
                            onClick={() => onItemClick(item.status)}
                            style={{ cursor: "pointer" }}
                        >
                            <div className={styles.itemRow}>
                                <div className={styles.itemLeft}>
                                    <div className={styles.statusDot} style={{ backgroundColor: item.color }} />
                                    <span className={styles.label}>{item.label}</span>
                                </div>
                                <div className={styles.itemLeft}>
                                    <span className={styles.count}>{item.count}</span>
                                    <ChevronRight size={16} className={styles.chevron} />
                                </div>
                            </div>
                            <div className={styles.progressBarContainer}>
                                <div
                                    className={styles.progressBar}
                                    style={{
                                        width: `${percentage}%`,
                                        backgroundColor: item.color
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <button className={styles.actionButton} onClick={onAction}>
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
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h2 className={styles.title}>Sales</h2>
            </div>

            <SummarySection
                title="Enquiries"
                items={data.enquiries}
                actionLabel="New Enquiry"
                viewAllPath="/quotes"
                onAction={() => navigate("/quotes?action=new")}
                onItemClick={(status) => navigate(`/quotes?status=${status}`)}
            />

            <SummarySection
                title="Quotes"
                items={data.quotes}
                actionLabel="New Quote"
                viewAllPath="/quotes"
                onAction={() => navigate("/quotes?action=new")}
                onItemClick={(status) => navigate(`/quotes?status=${status}`)}
            />

            <SummarySection
                title="Invoices"
                items={data.invoices}
                actionLabel="New Invoice"
                viewAllPath="/invoices"
                onAction={() => navigate("/invoices?action=new")}
                onItemClick={(status) => navigate(`/invoices?status=${status}`)}
            />
        </div>
    );
}
