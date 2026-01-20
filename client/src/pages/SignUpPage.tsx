import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, AlertCircle, CheckCircle, Building, Mail, Lock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import styles from "./AuthPages.module.css";

export default function SignUpPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { register } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsLoading(true);

        try {
            await register(email, password);
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to create account");
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.leftPanel}>
                    <div className={styles.brandContent}>
                        <img src="/logo.png" alt="Quotr" className={styles.brandLogo} />
                        <h1 className={styles.brandTitle}>Quotr Business</h1>
                        <p className={styles.brandTagline}>
                            Streamline your quotes, invoices, and job management with enterprise-grade tools.
                        </p>
                    </div>
                </div>
                <div className={styles.rightPanel}>
                    <div className={styles.authCard}>
                        <div className={styles.successMessage}>
                            <div className={styles.successIcon}>
                                <CheckCircle size={48} />
                            </div>
                            <h2>Check your email</h2>
                            <p>
                                We've sent a verification link to <strong>{email}</strong>.
                                Please check your inbox and click the link to activate your account.
                            </p>
                            <Link to="/login" className={styles.primaryButton}>
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.leftPanel}>
                <div className={styles.brandContent}>
                    <img src="/logo.png" alt="Quotr" className={styles.brandLogo} />
                    <h1 className={styles.brandTitle}>Quotr Business</h1>
                    <p className={styles.brandTagline}>
                        Streamline your quotes, invoices, and job management with enterprise-grade tools.
                    </p>
                    <div className={styles.features}>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>Unlimited quotes & invoices</span>
                        </div>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>AI-powered Foreman assistant</span>
                        </div>
                        <div className={styles.feature}>
                            <CheckCircle size={20} />
                            <span>Real-time business insights</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.authCard}>
                    <div className={styles.authHeader}>
                        <h2>Create your account</h2>
                        <p>Start your 14-day free trial. No credit card required.</p>
                    </div>

                    {error && (
                        <div className={styles.errorAlert}>
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form className={styles.authForm} onSubmit={handleSubmit}>
                        <div className={styles.inputGroup}>
                            <label>Company Name</label>
                            <div className={styles.inputWrapper}>
                                <Building size={18} className={styles.inputIcon} />
                                <input
                                    type="text"
                                    placeholder="Your business name"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

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
                                    placeholder="Min. 8 characters"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles.inputGroup}>
                            <label>Confirm Password</label>
                            <div className={styles.inputWrapper}>
                                <Lock size={18} className={styles.inputIcon} />
                                <input
                                    type="password"
                                    placeholder="Re-enter password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={styles.primaryButton}
                            disabled={isLoading}
                        >
                            <UserPlus size={20} />
                            {isLoading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    <div className={styles.authFooter}>
                        <span>Already have an account?</span>
                        <Link to="/login">Sign in</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
