import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Building, Phone, MapPin, Globe, Save, Check } from "lucide-react";
import { apiRequest } from "../lib/api";
import styles from "./ProfilePage.module.css";

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
                    <h1>Profile</h1>
                    <p className={styles.subtitle}>Manage your business information</p>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <Building size={14} />
                            Business Name
                        </label>
                        <input
                            type="text"
                            value={formData.businessName || profile?.businessName || ""}
                            onChange={(e) => handleChange("businessName", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <User size={14} />
                            Owner Name
                        </label>
                        <input
                            type="text"
                            value={formData.businessOwnerName || profile?.businessOwnerName || ""}
                            onChange={(e) => handleChange("businessOwnerName", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <Phone size={14} />
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={formData.phone || profile?.phone || ""}
                            onChange={(e) => handleChange("phone", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <Phone size={14} />
                            Mobile
                        </label>
                        <input
                            type="tel"
                            value={formData.mobile || profile?.mobile || ""}
                            onChange={(e) => handleChange("mobile", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            <Globe size={14} />
                            Website
                        </label>
                        <input
                            type="url"
                            value={formData.website || profile?.website || ""}
                            onChange={(e) => handleChange("website", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label className={styles.label}>
                            VAT Number
                        </label>
                        <input
                            type="text"
                            value={formData.vatNumber || profile?.vatNumber || ""}
                            onChange={(e) => handleChange("vatNumber", e.target.value)}
                            className={styles.input}
                        />
                    </div>

                    <div className={styles.formGroupFull}>
                        <label className={styles.label}>
                            <MapPin size={14} />
                            Address
                        </label>
                        <input
                            type="text"
                            value={formData.address || profile?.address || ""}
                            onChange={(e) => handleChange("address", e.target.value)}
                            className={styles.input}
                            placeholder="Address Line 1"
                        />
                        <input
                            type="text"
                            value={formData.address2 || profile?.address2 || ""}
                            onChange={(e) => handleChange("address2", e.target.value)}
                            className={styles.input}
                            placeholder="Address Line 2"
                        />
                        <input
                            type="text"
                            value={formData.address3 || profile?.address3 || ""}
                            onChange={(e) => handleChange("address3", e.target.value)}
                            className={styles.input}
                            placeholder="Address Line 3"
                        />
                    </div>
                </div>

                <div className={styles.actions}>
                    <button
                        type="submit"
                        className={styles.saveBtn}
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
