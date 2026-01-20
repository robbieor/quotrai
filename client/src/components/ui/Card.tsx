import React from 'react';
import styles from './Card.module.css';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Card variant */
    variant?: 'default' | 'section';
    /** Padding size */
    padding?: 'compact' | 'default' | 'large';
    /** Interactive card with hover state */
    interactive?: boolean;
    /** Card title */
    title?: string;
    /** Header right action */
    headerAction?: React.ReactNode;
    /** Footer content */
    footer?: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    (
        {
            variant = 'default',
            padding = 'default',
            interactive = false,
            title,
            headerAction,
            footer,
            children,
            className,
            onClick,
            ...props
        },
        ref
    ) => {
        const classNames = [
            styles.card,
            variant === 'section' && styles.section,
            padding === 'compact' && styles.compact,
            padding === 'large' && styles.large,
            interactive && styles.interactive,
            className,
        ]
            .filter(Boolean)
            .join(' ');

        return (
            <div
                ref={ref}
                className={classNames}
                onClick={onClick}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                {...props}
            >
                {(title || headerAction) && (
                    <div className={styles.header}>
                        {title && <h3 className={styles.title}>{title}</h3>}
                        {headerAction}
                    </div>
                )}
                <div className={styles.content}>{children}</div>
                {footer && <div className={styles.footer}>{footer}</div>}
            </div>
        );
    }
);

Card.displayName = 'Card';
