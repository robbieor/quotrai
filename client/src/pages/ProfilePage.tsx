import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Building, Phone, MapPin, Globe, Save, Check } from "lucide-react";
import { apiRequest } from "../lib/api";
import styles from "./InvoicesPage.module.css";

interface UserProfile {
    id?: number;
    businessName?: string;
    businessOwnerName?: string;
    businessNumber?: string;
    phone?: string;
    mobile?: string;
    website?: string;
    address?: string;
    address2?: string;
    address3?: string;
    vatNumber?: string;
    tradeType?: string;
    county?: string;
}

export default function ProfilePage() {
    const queryClient = useQueryClient();
    const [saved, setSaved] = useState(false);

    const { data: profile, isLoading } = useQuery<UserProfile>({
        queryKey: ["/api/profile"],
    });

    const [formData, setFormData] = useState<UserProfile>({});

    // Sync form data when profile loads
    useState(() => {
        if (profile) {
            setFormData(profile);
        }
    });

    const updateProfile = useMutation({
        mutationFn: async (data: UserProfile) => {
            await apiRequest("PUT", "/api/profile", data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        },
    });

    const handleChange = (field: keyof UserProfile, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfile.mutate(formData);
    };

    if (isLoading) {
        return <div className={styles.loading}>Loading profile...</div>;
    }

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Profile</h1>
                    <p className={styles.subtitle}>Manage your business information</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "24px",
                    background: "white",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    padding: "24px"
                }}>
                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <Building size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={formData.businessName || profile?.businessName || ""}
                            onChange={(e) => handleChange("businessName", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <User size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Owner Name
                        </label>
                        <input
                            type="text"
                            value={formData.businessOwnerName || profile?.businessOwnerName || ""}
                            onChange={(e) => handleChange("businessOwnerName", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <Phone size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone || profile?.phone || ""}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <Phone size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Mobile
                        </label>
                        <input
                            type="tel"
                            value={formData.mobile || profile?.mobile || ""}
                            onChange={(e) => handleChange("mobile", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <Globe size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Website
                        </label>
                        <input
                            type="url"
                            value={formData.website || profile?.website || ""}
                            onChange={(e) => handleChange("website", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            VAT Number
                        </label>
                        <input
                            type="text"
                            value={formData.vatNumber || profile?.vatNumber || ""}
                            onChange={(e) => handleChange("vatNumber", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                        />
                    </div>

                    <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ display: "block", fontWeight: 500, marginBottom: "8px", color: "#374151" }}>
                            <MapPin size={14} style={{ display: "inline", marginRight: "6px" }} />
                            Address
                        </label>
                        <input
                            type="text"
                            value={formData.address || profile?.address || ""}
                            onChange={(e) => handleChange("address", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px", marginBottom: "8px" }}
                            placeholder="Address Line 1"
                        />
                        <input
                            type="text"
                            value={formData.address2 || profile?.address2 || ""}
                            onChange={(e) => handleChange("address2", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px", marginBottom: "8px" }}
                            placeholder="Address Line 2"
                        />
                        <input
                            type="text"
                            value={formData.address3 || profile?.address3 || ""}
                            onChange={(e) => handleChange("address3", e.target.value)}
                            className={styles.searchInput}
                            style={{ width: "100%", padding: "10px 12px" }}
                            placeholder="Address Line 3"
                        />
                    </div>
                </div>

                <div style={{ marginTop: "24px", display: "flex", gap: "12px" }}>
                    <button
                        type="submit"
                        className={styles.createButton}
                        disabled={updateProfile.isPending}
                    >
                        {saved ? <Check size={20} /> : <Save size={20} />}
                        {saved ? "Saved!" : updateProfile.isPending ? "Saving..." : "Save Changes"}
                    </button>
                </div>
            </form>
        </div>
    );
}
