import { Clock } from "lucide-react";
import styles from "./TimeTrackingPage.module.css";

export default function TimeTrackingPage() {
    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1>Work Tracking</h1>
                    <div className={styles.dateTime}>
                        {new Date().toLocaleDateString("en-IE", { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            <div className={styles.idleCard}>
                <div className={styles.idleIcon}>
                    <Clock size={48} />
                </div>
                <h2>Time Tracking</h2>
                <p>Time tracking features are being migrated to Lovable Cloud. Check back soon!</p>
            </div>
        </div>
    );
}
