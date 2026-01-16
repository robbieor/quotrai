import { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown } from "lucide-react";
import styles from "./TopBar.module.css";
import { useAuth } from "../contexts/AuthContext";

export default function TopBar() {
    const { user } = useAuth();
    const [searchFocused, setSearchFocused] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good morning";
        if (hour < 17) return "Good afternoon";
        return "Good evening";
    };

    const dashboardDate = new Date().toLocaleDateString("en-IE", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const displayName = user?.profile?.businessOwnerName || user?.email?.split("@")[0] || "User";
    const businessName = user?.profile?.businessName || "My Business";

    return (
        <header className={styles.topBar}>
            <div className={styles.leftSection}>
                <h1 className={styles.greeting}>{getGreeting()}, {displayName}</h1>
                <span className={styles.date}>{dashboardDate}</span>
            </div>

            <div className={`${styles.searchContainer} ${searchFocused ? styles.searchContainerFocused : ""}`}>
                <Search size={16} color="#64748b" />
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search clients, quotes, invoices..."
                    className={styles.searchInput}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setSearchFocused(false)}
                />
                {!searchFocused && <span className={styles.shortcutHint}>⌘K</span>}
            </div>

            <div className={styles.rightSection}>
                <button className={styles.iconButton} title="Notifications">
                    <Bell size={20} />
                </button>

                <button className={styles.profileButton}>
                    <div className={styles.avatar}>
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className={styles.profileInfo}>
                        <span className={styles.profileName}>{businessName}</span>
                        <span className={styles.profileRole}>Administrator</span>
                    </div>
                    <ChevronDown size={16} color="#64748b" />
                </button>
            </div>
        </header>
    );
}
