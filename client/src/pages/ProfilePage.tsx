import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Building, Phone, Globe, Save, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "../contexts/AuthContext";
import styles from "./InvoicesPage.module.css";

export default function ProfilePage() {
    const { profile, user, refreshUser } = useAuth();
    const [saved, setSaved] = useState(false);
    const [fullName, setFullName] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [phone, setPhone] = useState("");
    const [tradeType, setTradeType] = useState("");

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || "");
            setCompanyName(profile.company_name || "");
            setPhone(profile.phone || "");
            setTradeType(profile.trade_type || "");
        }
    }, [profile]);

    const updateProfile = useMutation({
        mutationFn: async () => {
            if (!user) return;
            const { error } = await supabase.from("profiles").update({
                full_name: fullName || null,
                company_name: companyName || null,
                phone: phone || null,
                trade_type: tradeType || null,
            }).eq("id", user.id);
            if (error) throw error;
        },
        onSuccess: () => {
            refreshUser();
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile.mutate();
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div><h1 className={styles.title}>Profile</h1><p className={styles.subtitle}>Manage your business information</p></div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px", background: "white", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "24px" }}>
                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}><Building size={14} style={{ display: "inline", marginRight: "6px" }} />Business Name</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={styles.input} style={{ width: "100%" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}><User size={14} style={{ display: "inline", marginRight: "6px" }} />Full Name</label>
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={styles.input} style={{ width: "100%" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}><Phone size={14} style={{ display: "inline", marginRight: "6px" }} />Phone</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={styles.input} style={{ width: "100%" }} />
                    </div>
                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}><Globe size={14} style={{ display: "inline", marginRight: "6px" }} />Trade Type</label>
                        <input type="text" value={tradeType} onChange={(e) => setTradeType(e.target.value)} className={styles.input} style={{ width: "100%" }} placeholder="e.g. Plumber, Electrician" />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>Email</label>
                        <input type="email" value={user?.email || ""} disabled className={styles.input} style={{ width: "100%", opacity: 0.6 }} />
                    </div>
                </div>

                <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                    <button type="submit" className={styles.createBtn} disabled={updateProfile.isPending}>
                        {saved ? <Check size={20} /> : <Save size={20} />}
                        {saved ? "Saved!" : updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
