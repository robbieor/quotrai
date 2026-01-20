import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, UserPlus, X, Trash2, Mail } from "lucide-react";
import DataTable from "../components/DataTable";
import type { Column } from "../components/DataTable";
import { apiRequest } from "../lib/api";
import styles from "./InvoicesPage.module.css";

interface TeamMember {
    id: number;
    userId: number;
    organizationId: number;
    role: string;
    status: string;
    joinedAt: string;
    user?: {
        id: number;
        email: string;
    };
}

interface Invitation {
    id: number;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
}

export default function TeamPage() {
    const queryClient = useQueryClient();
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("staff");

    const { data: members = [], isLoading } = useQuery<TeamMember[]>({
        queryKey: ["/api/organizations/members"],
    });

    const { data: invitations = [] } = useQuery<Invitation[]>({
        queryKey: ["/api/organizations/invitations"],
    });

    const inviteMutation = useMutation({
        mutationFn: async (data: { email: string; role: string }) => {
            const res = await apiRequest("POST", "/api/organizations/invite", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
            queryClient.invalidateQueries({ queryKey: ["/api/organizations/invitations"] });
            closeModal();
        },
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
            const res = await apiRequest("PUT", `/api/organizations/members/${memberId}/role`, { role });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
        },
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (memberId: number) => {
            await apiRequest("DELETE", `/api/organizations/members/${memberId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/organizations/members"] });
        },
    });

    const cancelInviteMutation = useMutation({
        mutationFn: async (invitationId: number) => {
            await apiRequest("DELETE", `/api/organizations/invitations/${invitationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/organizations/invitations"] });
        },
    });

    const closeModal = () => {
        setShowInviteModal(false);
        setEmail("");
        setRole("staff");
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.includes("@")) return;
        inviteMutation.mutate({ email, role });
    };

    const handleRemoveMember = (member: TeamMember) => {
        if (member.role === "owner") {
            alert("Cannot remove the organization owner");
            return;
        }
        if (confirm(`Remove ${member.user?.email || "this member"} from the team?`)) {
            removeMemberMutation.mutate(member.id);
        }
    };

    const columns: Column<TeamMember>[] = [
        {
            key: "user",
            header: "Member",
            render: (row) => (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #0d9488 0%, #0f766e 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontWeight: 600,
                        fontSize: "14px"
                    }}>
                        {row.user?.email?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                        <div style={{ fontWeight: 500, color: "#1e293b" }}>{row.user?.email || "Unknown"}</div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                            Joined {new Date(row.joinedAt).toLocaleDateString("en-IE")}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: "role",
            header: "Role",
            render: (row) => {
                const colors: Record<string, { bg: string; text: string }> = {
                    owner: { bg: "#fef3c7", text: "#92400e" },
                    admin: { bg: "#dbeafe", text: "#1d4ed8" },
                    staff: { bg: "#dcfce7", text: "#166534" },
                    viewer: { bg: "#f1f5f9", text: "#475569" },
                };
                const style = colors[row.role] || colors.viewer;
                return (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <Shield size={14} color={style.text} />
                        {row.role === "owner" ? (
                            <span className={styles.statusBadge} style={{ backgroundColor: style.bg, color: style.text }}>
                                {row.role}
                            </span>
                        ) : (
                            <select
                                value={row.role}
                                onChange={(e) => updateRoleMutation.mutate({ memberId: row.id, role: e.target.value })}
                                style={{
                                    padding: "4px 8px",
                                    borderRadius: "4px",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "12px",
                                    backgroundColor: style.bg,
                                    color: style.text,
                                    fontWeight: 600
                                }}
                            >
                                <option value="admin">admin</option>
                                <option value="staff">staff</option>
                                <option value="viewer">viewer</option>
                            </select>
                        )}
                    </div>
                );
            },
        },
        {
            key: "status",
            header: "Status",
            render: (row) => {
                const isActive = row.status === "active";
                return (
                    <span className={styles.statusBadge} style={{
                        backgroundColor: isActive ? "#dcfce7" : "#f1f5f9",
                        color: isActive ? "#166534" : "#64748b"
                    }}>
                        {row.status}
                    </span>
                );
            },
        },
        {
            key: "actions",
            header: "",
            render: (row) => row.role !== "owner" ? (
                <button className={styles.deleteBtn} onClick={() => handleRemoveMember(row)}>
                    <Trash2 size={14} />
                </button>
            ) : null,
        },
    ];

    const pendingInvitations = invitations.filter(i => i.status === "pending");

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <h1>Team</h1>
                <button className={styles.createBtn} onClick={() => setShowInviteModal(true)}>
                    <UserPlus size={18} />
                    Invite Member
                </button>
            </div>

            <div className={styles.toolbar}>
                <div style={{ display: "flex", gap: 16 }}>
                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                        <strong>{members.length}</strong> Team Members
                    </span>
                    <span style={{ fontSize: 14, color: "var(--color-text-secondary)" }}>
                        <strong>{members.filter(m => m.status === "active").length}</strong> Active
                    </span>
                    {pendingInvitations.length > 0 && (
                        <span style={{ fontSize: 14, color: "#f59e0b" }}>
                            <strong>{pendingInvitations.length}</strong> Pending Invites
                        </span>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className={styles.loading}>Loading team members...</div>
            ) : (
                <DataTable columns={columns} data={members} emptyMessage="No team members yet. Invite your first team member!" />
            )}

            {pendingInvitations.length > 0 && (
                <div style={{ marginTop: 24 }}>
                    <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>Pending Invitations</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {pendingInvitations.map(inv => (
                            <div key={inv.id} style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 16px",
                                background: "#fffbeb",
                                borderRadius: 8,
                                border: "1px solid #fcd34d"
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <Mail size={16} color="#f59e0b" />
                                    <span style={{ fontWeight: 500 }}>{inv.email}</span>
                                    <span className={styles.statusBadge} style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>
                                        {inv.role}
                                    </span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <span style={{ fontSize: 12, color: "#64748b" }}>
                                        Expires {new Date(inv.expiresAt).toLocaleDateString()}
                                    </span>
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={() => cancelInviteMutation.mutate(inv.id)}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showInviteModal && (
                <div className={styles.modalOverlay} onClick={closeModal}>
                    <div className={styles.modal} style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>Invite Team Member</h2>
                            <button className={styles.closeBtn} onClick={closeModal}><X size={20} /></button>
                        </div>

                        <form onSubmit={handleInvite} className={styles.modalForm}>
                            <div className={styles.formSection}>
                                <label className={styles.label}>Email Address *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={styles.input}
                                    required
                                    placeholder="colleague@company.com"
                                />
                            </div>

                            <div className={styles.formSection}>
                                <label className={styles.label}>Role</label>
                                <select value={role} onChange={(e) => setRole(e.target.value)} className={styles.input}>
                                    <option value="admin">Admin - Full access to all features</option>
                                    <option value="staff">Staff - Can create and edit records</option>
                                    <option value="viewer">Viewer - Read-only access</option>
                                </select>
                            </div>

                            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
                                An email invitation will be sent to this address. They'll have 7 days to accept.
                            </p>

                            <div className={styles.modalFooter}>
                                <button type="button" className={styles.cancelBtn} onClick={closeModal}>Cancel</button>
                                <button type="submit" className={styles.submitBtn} disabled={!email.includes("@") || inviteMutation.isPending}>
                                    {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
