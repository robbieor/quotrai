import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button visual variant */
    variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success';
    /** Button size */
    size?: 'small' | 'medium' | 'large';
    /** Full width button */
    fullWidth?: boolean;
    /** Loading state */
    loading?: boolean;
    /** Left icon */
    leftIcon?: React.ReactNode;
    /** Right icon */
    rightIcon?: React.ReactNode;
    /** Render as anchor tag */
    as?: 'button' | 'a';
    /** Href for anchor variant */
    href?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            variant = 'primary',
            size = 'medium',
            fullWidth = false,
            loading = false,
            leftIcon,
            rightIcon,
            children,
            className,
            disabled,
            as = 'button',
            href,
            ...props
        },
        ref
    ) => {
        const classNames = [
            styles.button,
            styles[variant],
            size !== 'medium' && styles[size],
            fullWidth && styles.fullWidth,
            loading && styles.loading,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const content = (
            <>
                {loading && <span className={styles.spinner} />}
                {leftIcon && <span>{leftIcon}</span>}
                {children}
                {rightIcon && <span>{rightIcon}</span>}
            </>
        );

        if (as === 'a' && href) {
            return (
                <a
                    href={href}
                    className={classNames}
                    {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
                >
                    {content}
                </a>
            );
        }

        return (
            <button
                ref={ref}
                className={classNames}
                disabled={disabled || loading}
                {...props}
            >
                {content}
            </button>
        );
    }
);

Button.displayName = 'Button';
