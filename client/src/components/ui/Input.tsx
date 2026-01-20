import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    helperText?: string;
    /** Left icon */
    leftIcon?: React.ReactNode;
    /** Right icon (clickable) */
    rightIcon?: React.ReactNode;
    /** On right icon click */
    onRightIconClick?: () => void;
    /** Required field indicator */
    required?: boolean;
    /** Render as textarea */
    as?: 'input' | 'textarea';
    /** Textarea rows */
    rows?: number;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            label,
            error,
            helperText,
            leftIcon,
            rightIcon,
            onRightIconClick,
            required,
            as = 'input',
            rows = 4,
            className,
            id,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

        const inputClassNames = [
            styles.input,
            leftIcon && styles.hasLeftIcon,
            rightIcon && styles.hasRightIcon,
            error && styles.inputError,
            as === 'textarea' && styles.textarea,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const InputComponent = as === 'textarea' ? 'textarea' : 'input';

        return (
            <div className={styles.inputGroup}>
                {label && (
                    <label htmlFor={inputId} className={styles.label}>
                        {label}
                        {required && <span className={styles.required}>*</span>}
                    </label>
                )}
                <div className={styles.inputWrapper}>
                    {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
                    <InputComponent
                        ref={ref as any}
                        id={inputId}
                        className={inputClassNames}
                        aria-invalid={!!error}
                        aria-describedby={error ? `${inputId}-error` : undefined}
                        rows={as === 'textarea' ? rows : undefined}
                        {...(props as any)}
                    />
                    {rightIcon && (
                        <button
                            type="button"
                            className={styles.rightIcon}
                            onClick={onRightIconClick}
                            tabIndex={-1}
                        >
                            {rightIcon}
                        </button>
                    )}
                </div>
                {error && (
                    <span id={`${inputId}-error`} className={styles.errorMessage}>
                        {error}
                    </span>
                )}
                {helperText && !error && (
                    <span className={styles.helperText}>{helperText}</span>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';
