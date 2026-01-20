import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Job, Client } from "../types";
import styles from "./InvoicesPage.module.css";

interface JobWithClient extends Job {
    client?: Client;
}

export default function SchedulePage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    const { data: jobs = [], isLoading } = useQuery<JobWithClient[]>({
        queryKey: ["/api/jobs"],
    });

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

    const monthName = currentDate.toLocaleDateString("en-IE", { month: "long", year: "numeric" });

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const getJobsForDay = (day: number) => {
        return jobs.filter(job => {
            if (!job.date) return false;
            const jobDate = new Date(job.date);
            return jobDate.getDate() === day &&
                jobDate.getMonth() === currentDate.getMonth() &&
                jobDate.getFullYear() === currentDate.getFullYear();
        });
    };

    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        days.push(<div key={`empty-${i}`} style={{ padding: "8px", minHeight: "120px", border: "1px solid #f1f5f9" }} />);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

        const dayJobs = getJobsForDay(day);

        days.push(
            <div
                key={day}
                style={{
                    padding: "8px",
                    minHeight: "120px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "4px",
                    background: isToday ? "#f0fdfa" : "white",
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    transition: "all 0.2s ease"
                }}
            >
                <span style={{
                    fontWeight: isToday ? 700 : 500,
                    color: isToday ? "#0d9488" : "#64748b",
                    fontSize: "12px",
                    marginBottom: "4px"
                }}>
                    {day}
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflowY: "auto" }}>
                    {dayJobs.map(job => (
                        <div
                            key={job.id}
                            style={{
                                padding: "4px 8px",
                                background: job.status === "completed" ? "#f1f5f9" : "#dbeafe",
                                borderLeft: `3px solid ${job.status === "completed" ? "#94a3b8" : "#2563eb"}`,
                                borderRadius: "2px",
                                fontSize: "11px",
                                color: job.status === "completed" ? "#475569" : "#1e40af",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                cursor: "pointer"
                            }}
                            title={`${job.title} - ${job.client?.name || "No Client"}`}
                        >
                            {job.startTime && <span style={{ fontWeight: 600, marginRight: 4 }}>{job.startTime}</span>}
                            {job.title || "Untitled Job"}
                        </div>
                    ))}
                </div>
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
                padding: "24px",
                position: "relative"
            }}>
                {isLoading && (
                    <div style={{
                        position: "absolute",
                        inset: 0,
                        background: "rgba(255, 255, 255, 0.7)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 10,
                        borderRadius: "12px"
                    }}>
                        Loading...
                    </div>
                )}
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
