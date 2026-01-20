import { useQuery } from "@tanstack/react-query";
import { Clock, Play, Calendar, Briefcase } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import styles from "./InvoicesPage.module.css";

interface TimeEntry {
    id: number;
    userId: number;
    jobId: number | null;
    startTime: string;
    endTime: string | null;
    breakMinutes: number;
    notes: string | null;
    job?: { id: number; name: string } | null;
}

const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IE", {
        day: "numeric",
        month: "short",
    });
};

const calculateDuration = (start: string, end: string | null, breakMins: number) => {
    if (!end) return "In progress";
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const totalMins = Math.round((endTime - startTime) / 60000) - breakMins;
    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;
    return `${hours}h ${mins}m`;
};

export default function TimeTrackingPage() {
    const { data: entries = [], isLoading } = useQuery<TimeEntry[]>({
        queryKey: ["/api/time-entries"],
    });

    const todayEntries = entries.filter(entry => {
        const entryDate = new Date(entry.startTime).toDateString();
        const today = new Date().toDateString();
        return entryDate === today;
    });

    const totalTodayMins = todayEntries.reduce((total, entry) => {
        if (entry.startTime && entry.endTime) {
            const start = new Date(entry.startTime).getTime();
            const end = new Date(entry.endTime).getTime();
            return total + Math.round((end - start) / 60000) - (entry.breakMinutes || 0);
        }
        return total;
    }, 0);

    const columns: Column<TimeEntry>[] = [
        {
            key: "startTime",
            header: "Date",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#64748b" }}>
                    <Calendar size={14} />
                    {formatDate(row.startTime)}
                </div>
            ),
            sortable: true,
            width: "100px",
        },
        {
            key: "job",
            header: "Job",
            render: (row) => row.job?.name ? (
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <Briefcase size={14} color="#3b82f6" />
                    {row.job.name}
                </div>
            ) : "—",
        },
        {
            key: "time",
            header: "Time",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{formatTime(row.startTime)}</span>
                    <span style={{ color: "#94a3b8" }}>→</span>
                    <span>{row.endTime ? formatTime(row.endTime) : "—"}</span>
                </div>
            ),
            width: "160px",
        },
        {
            key: "duration",
            header: "Duration",
            render: (row) => {
                const isRunning = !row.endTime;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {isRunning ? (
                            <Play size={14} color="#10b981" />
                        ) : (
                            <Clock size={14} color="#64748b" />
                        )}
                        <span style={{ color: isRunning ? "#10b981" : "#1e293b", fontWeight: 500 }}>
                            {calculateDuration(row.startTime, row.endTime, row.breakMinutes)}
                        </span>
                    </div>
                );
            },
            width: "130px",
        },
        {
            key: "notes",
            header: "Notes",
            render: (row) => (
                <span style={{ color: "#64748b", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {row.notes || "—"}
                </span>
            ),
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Time Tracking</h1>
                    <p className={styles.subtitle}>Track work hours and job time</p>
                </div>
                <button className={styles.createButton}>
                    <Play size={20} />
                    Start Timer
                </button>
            </div>

            <div className={styles.toolbar}>
                <div className={styles.stats}>
                    <span className={styles.stat}>
                        <strong>{entries.length}</strong> Entries
                    </span>
                    <span className={styles.stat}>
                        <strong>{Math.floor(totalTodayMins / 60)}h {totalTodayMins % 60}m</strong> Today
                    </span>
                    <span className={styles.stat}>
                        <strong>{todayEntries.length}</strong> Today's Entries
                    </span>
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading time entries...</div>
            ) : (
                <DataTable<TimeEntry>
                    title=""
                    columns={columns}
                    data={entries}
                    pageSize={10}
                />
            )}
        </div>
    );
}
