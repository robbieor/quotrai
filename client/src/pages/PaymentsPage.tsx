import { useQuery } from "@tanstack/react-query";
import { CreditCard, Check, AlertCircle, ExternalLink } from "lucide-react";
import styles from "./PaymentsPage.module.css";

interface Subscription {
    id: number;
    status: string;
    planName?: string;
    currentPeriodEnd?: string;
}

export default function PaymentsPage() {
    const { data: subscription, isLoading } = useQuery<Subscription>({
        queryKey: ["/api/subscriptions/current"],
    });

    const isActive = subscription?.status === "active";

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1>Payments & Subscription</h1>
                    <p className={styles.subtitle}>Manage your subscription and billing</p>
                </div>
            </div>

            <div className={styles.cardGrid}>
                {/* Subscription Status Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div
                            className={styles.cardIcon}
                            style={{ background: isActive ? "#dcfce7" : "#fef3c7" }}
                        >
                            {isActive ? (
                                <Check size={24} color="#166534" />
                            ) : (
                                <AlertCircle size={24} color="#92400e" />
                            )}
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Subscription Status</h3>
                            <span
                                className={styles.cardSubtitle}
                                style={{ color: isActive ? "#166534" : "#92400e", fontWeight: 500 }}
                            >
                                {isActive ? "Active" : subscription?.status || "No subscription"}
                            </span>
                        </div>
                    </div>

                    {subscription?.planName && (
                        <div className={styles.planBox}>
                            <div className={styles.planLabel}>Current Plan</div>
                            <div className={styles.planName}>{subscription.planName}</div>
                        </div>
                    )}

                    {subscription?.currentPeriodEnd && (
                        <div className={styles.renewDate}>
                            Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IE", {
                                day: "numeric",
                                month: "long",
                                year: "numeric"
                            })}
                        </div>
                    )}
                </div>

                {/* Payment Methods Card */}
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <div className={styles.cardIcon} style={{ background: "#dbeafe" }}>
                            <CreditCard size={24} color="#1d4ed8" />
                        </div>
                        <div>
                            <h3 className={styles.cardTitle}>Payment Methods</h3>
                            <span className={styles.cardSubtitle}>Manage your payment options</span>
                        </div>
                    </div>

                    <button className={styles.manageBtn}>
                        <ExternalLink size={18} />
                        Manage Billing
                    </button>
                </div>
            </div>

            {isLoading && (
                <div className={styles.loading}>Loading subscription...</div>
            )}
        </div>
    );
}
