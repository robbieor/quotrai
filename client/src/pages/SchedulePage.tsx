import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import styles from "./InvoicesPage.module.css";

export default function SchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthName = currentDate.toLocaleDateString("en-IE", { month: "long", year: "numeric" });

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} style={{ padding: "8px", minHeight: "80px" }} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

        days.push(
            <div
                key={day}
                style={{
                    padding: "8px",
                    minHeight: "80px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    background: isToday ? "#f0fdfa" : "white",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                }}
            >
                <span style={{
                    fontWeight: isToday ? 600 : 400,
                    color: isToday ? "#0d9488" : "#64748b",
                    fontSize: "14px"
                }}>
                    {day}
                </span>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Schedule</h1>
                    <p className={styles.subtitle}>Manage appointments and job scheduling</p>
                </div>
            </div>

            <div style={{
                background: "white",
                borderRadius: "12px",
                border: "1px solid #e2e8f0",
                padding: "24px"
            }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px"
                }}>
                    <button
                        onClick={prevMonth}
                        style={{
                            padding: "8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        <ChevronLeft size={20} color="#64748b" />
                    </button>
                    <h2 style={{ fontSize: "18px", fontWeight: 600, color: "#1e293b" }}>
                        {monthName}
                    </h2>
                    <button
                        onClick={nextMonth}
                        style={{
                            padding: "8px",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            background: "white",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center"
                        }}
                    >
                        <ChevronRight size={20} color="#64748b" />
                    </button>
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "8px",
                    marginBottom: "8px"
                }}>
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} style={{
                            textAlign: "center",
                            fontWeight: 600,
                            color: "#64748b",
                            fontSize: "12px",
                            padding: "8px"
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "8px"
                }}>
                    {days}
                </div>
            </div>
        </div>
    );
}
