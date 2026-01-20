import React from 'react';
import styles from './FAB.module.css';

export interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Icon element */
    icon: React.ReactNode;
    /** Label for extended FAB */
    label?: string;
    /** Position variant */
    position?: 'relative' | 'fixed-center' | 'fixed-right';
    /** Small variant */
    size?: 'default' | 'small';
    /** Aria label for accessibility */
    ariaLabel: string;
}

export const FAB: React.FC<FABProps> = ({
    icon,
    label,
    position = 'relative',
    size = 'default',
    ariaLabel,
    className,
    ...props
}) => {
    const classNames = [
        styles.fab,
        label && styles.extended,
        size === 'small' && styles.small,
        position === 'fixed-center' && `${styles.fixed} ${styles.center}`,
        position === 'fixed-right' && `${styles.fixed} ${styles.right}`,
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <button
            className={classNames}
            aria-label={ariaLabel}
            {...props}
        >
            {icon}
            {label && <span className={styles.label}>{label}</span>}
        </button>
    );
};

FAB.displayName = 'FAB';
