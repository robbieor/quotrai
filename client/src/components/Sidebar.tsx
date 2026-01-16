import { Link, useLocation } from "react-router-dom";
import {
    LayoutGrid,
    Briefcase,
    ClipboardList,
    FileText,
    Users,
    Calendar,
    Clock,
    Cpu,
    CreditCard,
    Package,
    BarChart2,
    User,
    Settings,
    ChevronLeft,
    ChevronRight,
    LogOut
} from "lucide-react";
import styles from "./Sidebar.module.css";
import { useAuth } from "../contexts/AuthContext";

interface NavItem {
    label: string;
    icon: React.ElementType;
    path: string;
    badge?: number;
}

interface NavSection {
    title: string;
    items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
    {
        title: "Overview",
        items: [
            { label: "Dashboard", icon: LayoutGrid, path: "/" },
        ],
    },
    {
        title: "Work",
        items: [
            { label: "Jobs", icon: Briefcase, path: "/jobs" },
            { label: "Quotes", icon: ClipboardList, path: "/quotes" },
            { label: "Invoices", icon: FileText, path: "/invoices" },
        ],
    },
    {
        title: "Customers",
        items: [
            { label: "Clients", icon: Users, path: "/clients" },
        ],
    },
    {
        title: "Operations",
        items: [
            { label: "Schedule", icon: Calendar, path: "/schedule" },
            { label: "Time Tracking", icon: Clock, path: "/time-tracking" },
            { label: "Team", icon: Users, path: "/team" },
        ],
    },
    {
        title: "Tools",
        items: [
            { label: "Foreman AI", icon: Cpu, path: "/foreman" },
            { label: "Expenses", icon: CreditCard, path: "/expenses" },
            { label: "Materials", icon: Package, path: "/materials" },
            { label: "Reports", icon: BarChart2, path: "/reports" },
        ],
    },
    {
        title: "Settings",
        items: [
            { label: "Profile", icon: User, path: "/profile" },
            { label: "Payments", icon: Settings, path: "/payments" },
        ],
    },
];

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    const location = useLocation();
    const { logout } = useAuth();

    return (
        <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ""}`}>
            <div className={styles.header}>
                <div className={styles.logoRow}>
                    <img src="/logo.png" alt="Quotr" className={styles.logo} />
                    {!collapsed && <span className={styles.appName}>Quotr</span>}
                </div>
                <button className={styles.collapseButton} onClick={onToggle}>
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className={styles.navContainer}>
                {NAV_SECTIONS.map((section) => (
                    <div key={section.title} className={styles.section}>
                        {!collapsed && <span className={styles.sectionTitle}>{section.title}</span>}
                        {section.items.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;

                            return (
                                <Link
                                    key={item.label}
                                    to={item.path}
                                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ""} ${collapsed ? styles.navItemCollapsed : ""
                                        }`}
                                    title={collapsed ? item.label : ""}
                                >
                                    <Icon size={20} />
                                    {!collapsed && <span className={styles.navLabel}>{item.label}</span>}
                                    {!collapsed && item.badge && <span className={styles.badge}>{item.badge}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>

            <div className={styles.footer}>
                <button className={styles.logoutButton} onClick={logout}>
                    <LogOut size={20} />
                    {!collapsed && <span>Log Out</span>}
                </button>
            </div>
        </aside>
    );
}
