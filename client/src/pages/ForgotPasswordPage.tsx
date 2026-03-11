import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import styles from "./AuthPages.module.css";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setSuccess(true);
        } catch (err: any) {
            setError(err.message || "Failed to send reset email");
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
                        Secure password recovery for your enterprise account.
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
                            <h2>Check your email</h2>
                            <p>
                                If an account exists for <strong>{email}</strong>,
                                we've sent instructions to reset your password.
                            </p>
                            <Link to="/login" className={styles.primaryButton}>
                                Back to Sign In
                            </Link>
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className={styles.backLink}>
                                <ArrowLeft size={16} />
                                Back to sign in
                            </Link>

                            <div className={styles.authHeader}>
                                <h2>Reset your password</h2>
                                <p>Enter your email and we'll send you a reset link.</p>
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

                                <button
                                    type="submit"
                                    className={styles.primaryButton}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Sending..." : "Send Reset Link"}
                                </button>
                            </form>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
