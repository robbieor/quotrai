import React from 'react';
import styles from './StatusBadge.module.css';

export type BadgeStatus =
    | 'paid'
    | 'sent'
    | 'overdue'
    | 'draft'
    | 'pending'
    | 'new'
    | 'cancelled'
    | 'active'
    | 'inactive';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    /** Badge status determines color scheme */
    status: BadgeStatus;
    /** Custom label (defaults to capitalized status) */
    label?: string;
}

const defaultLabels: Record<BadgeStatus, string> = {
    paid: 'Paid',
    sent: 'Sent',
    overdue: 'Overdue',
    draft: 'Draft',
    pending: 'Pending',
    new: 'New',
    cancelled: 'Cancelled',
    active: 'Active',
    inactive: 'Inactive',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
    status,
    label,
    className,
    ...props
}) => {
    const classNames = [styles.badge, styles[status], className]
        .filter(Boolean)
        .join(' ');

    return (
        <span className={classNames} {...props}>
            {label || defaultLabels[status]}
        </span>
    );
};

StatusBadge.displayName = 'StatusBadge';
