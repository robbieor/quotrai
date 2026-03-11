import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Lock, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import styles from "./AuthPages.module.css";

export default function ResetPasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);

    useEffect(() => {
        // Check for recovery event in URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        if (hashParams.get("type") === "recovery") {
            setIsRecovery(true);
        }

        // Also listen for auth state change with recovery event
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === "PASSWORD_RECOVERY") {
                setIsRecovery(true);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

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
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setSuccess(true);
            setTimeout(() => navigate("/login"), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to reset password");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isRecovery) {
        return (
            <div className={styles.container}>
                <div className={styles.leftPanel}>
                    <div className={styles.brandContent}>
                        <img src="/logo.png" alt="Quotr" className={styles.brandLogo} />
                        <h1 className={styles.brandTitle}>Quotr Business</h1>
                    </div>
                </div>
                <div className={styles.rightPanel}>
                    <div className={styles.authCard}>
                        <div className={styles.errorAlert}>
                            <AlertCircle size={16} />
                            Invalid or expired reset link. Please request a new password reset.
                        </div>
                        <Link to="/forgot-password" className={styles.primaryButton}>
                            Request New Reset Link
                        </Link>
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
                        Create a strong, secure password for your account.
                    </p>
                </div>
            </div>

            <div className={styles.rightPanel}>
                <div className={styles.authCard}>
                    {success ? (
                        <div className={styles.successMessage}>
                            <div className={styles.successIcon}>
                                <CheckCircle size={48} />
                            </div>
                            <h2>Password Reset!</h2>
                            <p>
                                Your password has been successfully reset.
                                Redirecting you to sign in...
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className={styles.authHeader}>
                                <h2>Set new password</h2>
                                <p>Choose a strong password for your account.</p>
                            </div>

                            {error && (
                                <div className={styles.errorAlert}>
                                    <AlertCircle size={16} />
                                    {error}
                                </div>
                            )}

                            <form className={styles.authForm} onSubmit={handleSubmit}>
                                <div className={styles.inputGroup}>
                                    <label>New Password</label>
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
                                    <label>Confirm New Password</label>
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
                                    {isLoading ? "Resetting..." : "Reset Password"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
