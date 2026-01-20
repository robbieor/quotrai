import React from 'react';
import styles from './Divider.module.css';

export interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
    /** Divider variant */
    variant?: 'standard' | 'section' | 'inset';
    /** Vertical orientation */
    vertical?: boolean;
}

export const Divider: React.FC<DividerProps> = ({
    variant = 'standard',
    vertical = false,
    className,
    ...props
}) => {
    const classNames = [
        styles.divider,
        vertical ? styles.vertical : styles[variant],
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return <hr className={classNames} {...props} />;
};

Divider.displayName = 'Divider';
