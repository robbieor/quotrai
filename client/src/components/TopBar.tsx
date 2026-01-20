import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import styles from "./TopBar.module.css";
import { useAuth } from "../contexts/AuthContext";
import { apiRequest } from "../lib/api";

export default function TopBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchFocused, setSearchFocused] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);
    const profileRef = useRef<HTMLDivElement>(null);

    const { data: notifications = [] } = useQuery<any[]>({
        queryKey: ["/api/notifications"],
        enabled: !!user,
    });

    const unreadCount = notifications.filter((n: any) => !n.read).length;

    const readAllMutation = useMutation({
        mutationFn: () => apiRequest("PUT", "/api/notifications/read-all", {}),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notifications"] }),
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        const handleClickOutside = (e: MouseEvent) => {
            if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
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

    const displayName = user?.profile?.businessOwnerName || user?.email?.split("@")[0] || "User";
    const businessName = user?.profile?.businessName || "My Business";

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
                <div ref={notificationsRef} style={{ position: "relative" }}>
                    <button
                        className={styles.iconButton}
                        onClick={() => setShowNotifications(!showNotifications)}
                        title="Notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
                    </button>

                    {showNotifications && (
                        <div className={`${styles.dropdown} ${styles.notificationDropdown}`}>
                            <div className={styles.dropdownHeader}>
                                <span className={styles.dropdownTitle}>Notifications</span>
                                {unreadCount > 0 && (
                                    <button
                                        className={styles.clearAll}
                                        onClick={() => readAllMutation.mutate()}
                                    >
                                        Mark all as read
                                    </button>
                                )}
                            </div>
                            <div className={styles.dropdownList}>
                                {notifications.length > 0 ? (
                                    notifications.map((n: any) => (
                                        <div key={n.id} className={styles.dropdownItem}>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ fontSize: "13px", fontWeight: n.read ? 400 : 600, color: "var(--color-text)", marginBottom: "4px" }}>
                                                    {n.title}
                                                </p>
                                                <p style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                                                    {n.message}
                                                </p>
                                            </div>
                                            {!n.read && <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--dashboard-accent-teal)", marginTop: "4px" }} />}
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>No notifications</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

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
