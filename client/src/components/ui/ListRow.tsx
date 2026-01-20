import React from 'react';
import { ChevronRight } from 'lucide-react';
import styles from './ListRow.module.css';

export interface ListRowProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Leading element (avatar, icon, thumbnail) */
    leading?: React.ReactNode;
    /** Main title */
    title: string;
    /** Subtitle text */
    subtitle?: string;
    /** Meta text (date, count, etc.) */
    meta?: string;
    /** Trailing element (amount, status, action) */
    trailing?: React.ReactNode;
    /** Amount to display (formatted) */
    amount?: string;
    /** Show navigation chevron */
    showChevron?: boolean;
    /** Interactive row with hover state */
    interactive?: boolean;
    /** Hide bottom border */
    noBorder?: boolean;
}

export const ListRow = React.forwardRef<HTMLDivElement, ListRowProps>(
    (
        {
            leading,
            title,
            subtitle,
            meta,
            trailing,
            amount,
            showChevron = false,
            interactive = false,
            noBorder = false,
            className,
            onClick,
            ...props
        },
        ref
    ) => {
        const classNames = [
            styles.listRow,
            interactive && styles.interactive,
            noBorder && styles.noBorder,
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
                {leading && <div className={styles.leading}>{leading}</div>}

                <div className={styles.content}>
                    <p className={styles.title}>{title}</p>
                    {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
                    {meta && <span className={styles.meta}>{meta}</span>}
                </div>

                <div className={styles.trailing}>
                    {amount && <span className={styles.amount}>{amount}</span>}
                    {trailing}
                    {showChevron && (
                        <ChevronRight size={20} className={styles.chevron} />
                    )}
                </div>
            </div>
        );
    }
);

ListRow.displayName = 'ListRow';
