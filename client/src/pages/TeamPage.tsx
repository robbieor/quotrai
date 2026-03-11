import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, UserPlus, Trash2 } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

export default function TeamPage() {
    const { teamId } = useAuth();
    const [showInviteModal, setShowInviteModal] = useState(false);

    const { data: members = [], isLoading } = useQuery({
        queryKey: ["team_memberships", teamId],
        queryFn: async () => {
            if (!teamId) return [];
            const { data, error } = await supabase
                .from("team_memberships")
                .select("*, profiles(email, full_name)")
                .eq("team_id", teamId);
            if (error) throw error;
            return data || [];
        },
        enabled: !!teamId,
    });

    const columns: Column<any>[] = [
        {
            key: "user", header: "Member",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 600, fontSize: "14px" }}>
                        {(row.profiles?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500, color: "#1e293b" }}>{row.profiles?.full_name || row.profiles?.email || "Unknown"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>{row.profiles?.email || ""}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "role", header: "Role",
            render: (row) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    owner: { bg: "#fef3c7", text: "#92400e" }, manager: { bg: "#dbeafe", text: "#1d4ed8" },
                    member: { bg: "#dcfce7", text: "#166534" }, viewer: { bg: "#f1f5f9", text: "#475569" },
                };
                const style = colors[row.role] || colors.member;
                return <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><Shield size={14} color={style.text} /><span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>{row.role}</span></div>;
            },
        },
    ];

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Team</h1>
                <button className={styles.createBtn} onClick={() => setShowInviteModal(true)}><UserPlus size={18} /> Invite Member</button>
            </div>
            <div className={styles.toolbar}>
                <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}><strong>{members.length}</strong> Team Members</span>
                </div>
            </div>
            {isLoading ? <div className={styles.loading}>Loading team members...</div> : <DataTable columns={columns} data={members} emptyMessage="No team members yet." />}
        </div>
    );
}
