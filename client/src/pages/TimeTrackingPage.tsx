import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Clock, Play, Square, Briefcase, CheckCircle, AlertCircle, Timer, Coffee
} from "lucide-react";
import { apiRequest } from "../lib/api";
import type { ClockEntry } from "../types";
import styles from "./TimeTrackingPage.module.css";

interface ActiveClockEntry extends ClockEntry {
    jobTitle?: string;
    clientName?: string;
    clientAddress?: string;
    clockInVerified?: boolean;
}

interface JobAssignment {
    id: number;
    jobId: number;
    jobTitle: string;
    clientName: string;
    notes: string | null;
}

const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "--:--";
    return new Date(dateStr).toLocaleTimeString("en-IE", {
        hour: "2-digit",
        minute: "2-digit",
    });
};

const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IE", {
        weekday: "short",
        day: "numeric",
        month: "short",
    });
};

export default function TimeTrackingPage() {
    const queryClient = useQueryClient();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const { data: activeEntry } = useQuery<ActiveClockEntry | null>({
        queryKey: ["/api/clock-entries/active"],
    });

    const { data: assignments = [], isLoading: isAssignmentsLoading } = useQuery<JobAssignment[]>({
        queryKey: ["/api/employee-assignments"],
    });

    const { data: recentEntries = [], isLoading: isRecentLoading } = useQuery<ClockEntry[]>({
        queryKey: ["/api/time-entries"],
    });

    const clockInMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/clock-entries/clock-in", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clock-entries/active"] });
        },
    });

    const clockOutMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await apiRequest("POST", "/api/clock-entries/clock-out", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clock-entries/active"] });
            queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
        },
    });

    const breakStartMutation = useMutation({
        mutationFn: async () => {
            const res = await apiRequest("POST", "/api/clock-entries/break/start", {});
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/clock-entries/breaks"] });
            queryClient.invalidateQueries({ queryKey: ["/api/clock-entries/active"] });
        },
    });



    const handleClockIn = (jobId: number) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clockInMutation.mutate({
                        jobId,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    clockInMutation.mutate({ jobId });
                }
            );
        } else {
            clockInMutation.mutate({ jobId });
        }
    };

    const handleClockOut = () => {
        if (!activeEntry) return;
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clockOutMutation.mutate({
                        id: activeEntry.id,
                        latitude: pos.coords.latitude,
                        longitude: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                    });
                },
                (err) => {
                    console.error("Geolocation error:", err);
                    clockOutMutation.mutate({ id: activeEntry.id });
                }
            );
        } else {
            clockOutMutation.mutate({ id: activeEntry.id });
        }
    };

    const getElapsedTime = () => {
        if (!activeEntry) return "00:00:00";
        const start = new Date(activeEntry.clockInTime).getTime();
        const diff = currentTime.getTime() - start;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1>Work Tracking</h1>
                    <div className={styles.dateTime}>
                        {currentTime.toLocaleDateString("en-IE", { weekday: 'long', day: 'numeric', month: 'long' })}
                        <span className={styles.separator}>•</span>
                        {currentTime.toLocaleTimeString("en-IE", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>

            {activeEntry ? (
                <div className={styles.activeCard}>
                    <div className={styles.activeHeader}>
                        <div className={styles.statusBadge}>
                            <div className={styles.pulse}></div>
                            LIVE SESSION
                        </div>
                        <div className={styles.activeJobInfo}>
                            <h2>{activeEntry.jobTitle || "Current Job"}</h2>
                            <p>{activeEntry.clientName || "Unknown Client"}</p>
                        </div>
                    </div>

                    <div className={styles.timerContainer}>
                        <div className={styles.timerLabel}>ELAPSED TIME</div>
                        <div className={styles.timerValue}>{getElapsedTime()}</div>
                        <div className={styles.timerStart}>Clocked in at {formatTime(activeEntry.clockInTime)}</div>
                    </div>

                    <div className={styles.activeActions}>
                        <button
                            className={styles.breakBtn}
                            onClick={() => breakStartMutation.mutate()}
                            disabled={breakStartMutation.isPending}
                        >
                            <Coffee size={20} />
                            Take Break
                        </button>
                        <button
                            className={styles.clockOutBtn}
                            onClick={handleClockOut}
                            disabled={clockOutMutation.isPending}
                        >
                            <Square size={20} />
                            Clock Out
                        </button>
                    </div>

                    {activeEntry.clockInVerified ? (
                        <div className={styles.verifiedLocation}>
                            <CheckCircle size={14} /> Location Verified
                        </div>
                    ) : (
                        <div className={styles.unverifiedLocation}>
                            <AlertCircle size={14} /> Location Unverified
                        </div>
                    )}
                </div>
            ) : (
                <div className={styles.idleCard}>
                    <div className={styles.idleIcon}>
                        <Clock size={48} />
                    </div>
                    <h2>Not Clocked In</h2>
                    <p>Select an assigned job below to start your shift.</p>
                </div>
            )}

            <div className={styles.section}>
                <div className={styles.sectionHeader}>
                    <h3>Your Assigned Jobs</h3>
                    <span className={styles.count}>{assignments.length}</span>
                </div>

                {isAssignmentsLoading ? (
                    <div className={styles.loading}>Loading assignments...</div>
                ) : assignments.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Briefcase size={32} />
                        <p>No jobs assigned to you at the moment.</p>
                    </div>
                ) : (
                    <div className={styles.assignmentsGrid}>
                        {assignments.map(assign => (
                            <div key={assign.id} className={styles.assignmentCard}>
                                <div className={styles.assignInfo}>
                                    <h4>{assign.jobTitle}</h4>
                                    <p className={styles.client}>{assign.clientName}</p>
                                    {assign.notes && <p className={styles.notes}>{assign.notes}</p>}
                                </div>
                                <button
                                    className={styles.miniClockIn}
                                    onClick={() => handleClockIn(assign.jobId)}
                                    disabled={!!activeEntry || clockInMutation.isPending}
                                >
                                    <Play size={16} />
                                    <span>Clock In</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className={styles.section}>
                <h3>Recent Activity</h3>
                <div className={styles.activityList}>
                    {isRecentLoading ? (
                        <p className={styles.placeholder}>Loading recent activity...</p>
                    ) : recentEntries.length === 0 ? (
                        <p className={styles.placeholder}>Your recent clock-ins will appear here.</p>
                    ) : (
                        recentEntries.slice(0, 5).map((entry: any) => (
                            <div key={entry.id} className={styles.activityItem}>
                                <div className={styles.activityIcon}>
                                    <Timer size={16} />
                                </div>
                                <div className={styles.activityDetails}>
                                    <span className={styles.activityTitle}>{entry.jobTitle || entry.description || "Time Entry"}</span>
                                    <span className={styles.activityMeta}>
                                        {entry.clientName && `${entry.clientName} • `}
                                        {formatDate(entry.date)} • {entry.duration ? `${Math.round(entry.duration / 60)}h ${entry.duration % 60}m` : "--"}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
