import { useState, useCallback } from "react";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";
import FloatingAssistant from "../components/FloatingAssistant";
import styles from "./DashboardLayout.module.css";

export interface DashboardLayoutProps {
    children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleToggleSidebar = useCallback(() => {
        // On mobile, toggle the drawer
        if (window.innerWidth <= 768) {
            setMobileOpen(prev => !prev);
        } else {
            setSidebarCollapsed(prev => !prev);
        }
    }, []);

    const handleCloseMobile = useCallback(() => {
        setMobileOpen(false);
    }, []);

    return (
        <div className={styles.layout}>
            {mobileOpen && (
                <div className={styles.backdrop} onClick={handleCloseMobile} />
            )}
            <Sidebar
                collapsed={sidebarCollapsed}
                onToggle={handleToggleSidebar}
                mobileOpen={mobileOpen}
                onCloseMobile={handleCloseMobile}
            />

            <div className={styles.mainContent}>
                <TopBar onMenuToggle={handleToggleSidebar} />
                <main className={styles.content}>
                    {children}
                </main>
                <FloatingAssistant />
            </div>
        </div>
    );
}
