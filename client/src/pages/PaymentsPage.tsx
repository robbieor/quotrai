import { CreditCard, Check, AlertCircle, ExternalLink } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

export default function PaymentsPage() {
    const { teamId } = useAuth();

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div><h1 className={styles.title}>Payments & Subscription</h1><p className={styles.subtitle}>Manage your subscription and billing</p></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#dcfce7", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Check size={24} color="#166534" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Subscription Status</h3>
                            <span style={{ fontSize: "14px", color: "#166534", fontWeight: 500 }}>Active</span>
                        </div>
                    </div>
                    <div style={{ padding: "12px", background: "#f8fafc", borderRadius: "8px" }}>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "4px" }}>Current Plan</div>
                        <div style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>Professional</div>
                    </div>
                </div>
                <div style={{ background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ width: 48, height: 48, borderRadius: "12px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <CreditCard size={24} color="#1d4ed8" />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "#1e293b" }}>Payment Methods</h3>
                            <span style={{ fontSize: "14px", color: "#64748b" }}>Manage your payment options</span>
                        </div>
                    </div>
                    <button className={styles.createBtn} style={{ width: "100%" }}><ExternalLink size={18} /> Manage Billing</button>
                </div>
            </div>
        </div>
    );
}
