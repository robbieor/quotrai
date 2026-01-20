import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css";

interface SlideItem {
    icon?: string;
    color: string;
    label: string;
    sublabel?: string;
    value?: string;
    badge?: string;
    highlight?: string;
    progress?: number;
}

interface Slide {
    headline: string;
    description: string;
    icon: string;
    items: SlideItem[];
}

const slides: Slide[] = [
    {
        headline: "Create Quotes in Seconds",
        description: "Build professional quotes on-site with your phone. Add line items, photos, and send instantly to clients.",
        icon: "📝",
        items: [
            { icon: "📝", color: "teal", label: "Kitchen Renovation", sublabel: "John Smith - Dublin", value: "€4,850" },
            { icon: "🔧", color: "blue", label: "Labour (16 hours)", sublabel: "€45/hour", value: "€720" },
            { icon: "📦", color: "orange", label: "Materials", sublabel: "Cabinets, countertops", value: "€3,200" },
        ],
    },
    {
        headline: "Convert to Invoice Instantly",
        description: "One tap converts any approved quote into a professional invoice. No re-typing, no mistakes.",
        icon: "✓",
        items: [
            { icon: "✓", color: "green", label: "Quote Accepted!", sublabel: "Client approved 2 mins ago", highlight: "green" },
            { icon: "📄", color: "blue", label: "Invoice #INV-0042", sublabel: "Created automatically", value: "€4,850", highlight: "blue" },
        ],
    },
    {
        headline: "AI-Powered Receipt Scanning",
        description: "Snap a photo of any receipt or supplier invoice. Foreman AI extracts the details automatically.",
        icon: "🤖",
        items: [
            { icon: "🤖", color: "purple", label: "Receipt detected", sublabel: "Scanning with AI..." },
            { icon: "", color: "purple", label: "Extracted Details", sublabel: "Supplier: Murphy's Hardware • Amount: €247.50 • Category: Materials", highlight: "purple" },
        ],
    },
    {
        headline: "Track Every Job in Real-Time",
        description: "See all your jobs at a glance. Know what's scheduled, in progress, and completed.",
        icon: "📅",
        items: [
            { icon: "📅", color: "orange", label: "Bathroom Refit", sublabel: "Today, 9:00 AM", badge: "Scheduled" },
            { icon: "🔨", color: "blue", label: "Plumbing Repair", sublabel: "In progress", badge: "Active" },
            { icon: "✓", color: "green", label: "Electrical Install", sublabel: "Completed yesterday", badge: "Done" },
        ],
    },
    {
        headline: "Get Paid Faster",
        description: "Send invoices with payment links. Track who's viewed them and chase overdue payments automatically.",
        icon: "💰",
        items: [
            { icon: "👁", color: "green", label: "Invoice Viewed", sublabel: "Client opened 10 mins ago", highlight: "green" },
            { icon: "💳", color: "teal", label: "Payment Link Sent", sublabel: "Stripe checkout ready", value: "€2,450" },
            { icon: "⚠", color: "orange", label: "Reminder Scheduled", sublabel: "Auto-send in 3 days", highlight: "yellow" },
        ],
    },
    {
        headline: "Know Your Profit Margins",
        description: "Real-time analytics show exactly how profitable each job is. Spot problems before they cost you.",
        icon: "📊",
        items: [
            { icon: "", color: "teal", label: "This Month", value: "€12,450", progress: 78 },
            { icon: "", color: "green", label: "Profit Margin", value: "32%", progress: 32 },
            { icon: "📈", color: "green", label: "+18% vs Last Month", sublabel: "You're on track!" },
        ],
    },
    {
        headline: "Manage Your Whole Team",
        description: "GPS time tracking, leave requests, and team chat. Know where everyone is and what they're working on.",
        icon: "👥",
        items: [
            { icon: "👤", color: "teal", label: "Mike O'Brien", sublabel: "Clocked in at 8:02 AM", badge: "On Site" },
            { icon: "👤", color: "blue", label: "Sean Murphy", sublabel: "Travelling to next job", badge: "In Transit" },
            { icon: "👤", color: "orange", label: "Lisa Kelly", sublabel: "Annual leave", badge: "Off" },
        ],
    },
];

export default function LandingPage() {
    const [currentSlide, setCurrentSlide] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const slide = slides[currentSlide];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>
                    <img src="/logo.png" alt="Quotr" className={styles.logoImg} />
                </div>
            </header>

            <main className={styles.main}>
                <div className={styles.leftPanel}>
                    <div className={styles.branding}>
                        <img src="/wordmark.png" alt="Quotr" className={styles.wordmark} />
                    </div>

                    <div className={styles.carousel}>
                        <div className={styles.slideContent}>
                            <h2 className={styles.slideHeadline}>{slide.headline}</h2>
                            <p className={styles.slideDescription}>{slide.description}</p>

                            <div className={styles.mockup}>
                                <div className={styles.mockupHeader}>
                                    <div className={styles.mockupDots}>
                                        <span className={styles.dot} style={{ background: "#ef4444" }}></span>
                                        <span className={styles.dot} style={{ background: "#f59e0b" }}></span>
                                        <span className={styles.dot} style={{ background: "#10b981" }}></span>
                                    </div>
                                    <span className={styles.mockupTitle}>{slide.headline}</span>
                                </div>

                                <div className={styles.mockupBody}>
                                    {slide.items.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className={styles.mockupRow}
                                            data-highlight={item.highlight}
                                        >
                                            {item.icon && <div className={styles.mockupIcon} data-color={item.color}>{item.icon}</div>}
                                            <div className={styles.mockupText}>
                                                <div className={styles.mockupLabel}>{item.label}</div>
                                                <div className={styles.mockupSublabel}>{item.sublabel}</div>
                                                {item.progress !== undefined && (
                                                    <div className={styles.progressBar}>
                                                        <div className={styles.progressFill} style={{ width: `${item.progress}%` }} data-color={item.color}></div>
                                                    </div>
                                                )}
                                            </div>
                                            {item.value && <div className={styles.mockupValue}>{item.value}</div>}
                                            {item.badge && <span className={styles.badge}>{item.badge}</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={styles.carouselDots}>
                            {slides.map((_, idx) => (
                                <button
                                    key={idx}
                                    className={`${styles.carouselDot} ${idx === currentSlide ? styles.active : ""}`}
                                    onClick={() => setCurrentSlide(idx)}
                                    aria-label={`Slide ${idx + 1}`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                <div className={styles.rightPanel}>
                    <div className={styles.loginCard}>
                        <div className={styles.loginBranding}>
                            <img src="/logo.png" alt="Quotr" className={styles.loginLogo} />
                            <img src="/wordmark.png" alt="Quotr" className={styles.loginWordmark} />
                        </div>

                        <Link to="/login" className={styles.primaryBtn}>
                            Sign In
                        </Link>

                        <div className={styles.divider}>or</div>

                        <Link to="/signup" className={styles.secondaryBtn}>
                            Create Account
                        </Link>

                        <p className={styles.tagline}>
                            Professional invoicing for trades
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
