import { useState } from "react";
import { Link } from "react-router-dom";
import { LogIn, AlertCircle, Mail, Lock, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./AuthPages.module.css";

export default function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await login(email, password);
        } catch (err: any) {
            setError(err.message || "Invalid email or password");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.brandContent}>
                    <img src="/logo.png" alt="Quotr" className={styles.brandLogo} />
                    <h1 className={styles.brandTitle}>Quotr Business</h1>
                    <p className={styles.brandTagline}>
                        The enterprise platform for quotes, invoices, and job management. Built for growing businesses.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>Professional quotes & invoices</span>
                        </div>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>Real-time financial insights</span>
                        </div>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>Team collaboration tools</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h2>Welcome back</h2>
                        <p>Sign in to continue to your dashboard</p>
                    </div>

                    {error && (
                        <div className={styles.errorAlert}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form className={styles.authForm} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label>Email Address</label>
                            <div className={styles.inputWrapper}>
                                <Mail size={18} className={styles.inputIcon} />
                                <input
                                    type="email"
                                    placeholder="you@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <Link to="/forgot-password" className={styles.secondaryLink}>
                            Forgot password?
                        </Link>

                        <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={isLoading}
                            onTouchEnd={(e) => {
                                // Prevent double-firing on devices that support both touch and click
                                e.preventDefault();
                                if (!isLoading) {
                                    const form = e.currentTarget.closest('form');
                                    if (form) {
                                        form.requestSubmit();
                                    }
                                }
                            }}
                        >
                            <LogIn size={20} />
                            {isLoading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <span>Don't have an account?</span>
                        <Link to="/signup">Create one</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
