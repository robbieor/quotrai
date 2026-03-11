import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import styles from "./TopBar.module.css";
import { useAuth } from "../contexts/AuthContext";

export default function TopBar() {
    const { user, profile, logout } = useAuth();
    const navigate = useNavigate();
    const [searchFocused, setSearchFocused] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
                setShowProfileMenu(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("mousedown", handleClickOutside);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("mousedown", handleClickOutside);
        };
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

    const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
    const businessName = profile?.company_name || "My Business";

    const handleLogout = async () => {
        await logout();
        navigate("/login");
    };

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

                <div ref={profileRef} style={{ position: "relative" }}>
                    <button
                        className={styles.profileButton}
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                    >
                        <div className={styles.avatar}>
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.profileInfo}>
                            <span className={styles.profileName}>{businessName}</span>
                            <span className={styles.profileRole}>Administrator</span>
                        </div>
                        <ChevronDown
                            size={16}
                            color="#64748b"
                            style={{ transform: showProfileMenu ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
                        />
                    </button>

                    {showProfileMenu && (
                        <div className={styles.dropdown}>
                            <button className={styles.menuItem} onClick={() => { navigate("/profile"); setShowProfileMenu(false); }}>
                                <User size={16} />
                                Profile Management
                            </button>
                            <button className={styles.menuItem} onClick={() => { navigate("/payments"); setShowProfileMenu(false); }}>
                                <Settings size={16} />
                                Account Settings
                            </button>
                            <div style={{ borderTop: "1px solid var(--color-border)", margin: "4px 0" }} />
                            <button className={`${styles.menuItem} ${styles.menuItemDanger}`} onClick={handleLogout}>
                                <LogOut size={16} />
                                Log Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
