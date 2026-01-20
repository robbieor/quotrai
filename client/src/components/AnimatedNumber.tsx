import { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
    value: number;
    duration?: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
    easing?: "easeOut" | "easeInOut" | "spring";
}

// Easing functions
const easings = {
    easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
    easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    spring: (t: number) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },
};

export default function AnimatedNumber({
    value,
    duration = 1000,
    decimals = 0,
    prefix = "",
    suffix = "",
    className = "",
    easing = "easeOut",
}: AnimatedNumberProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValueRef = useRef(0);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValueRef.current;
        const endValue = value;
        const startTime = performance.now();
        const easeFn = easings[easing];

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeFn(progress);

            const currentValue = startValue + (endValue - startValue) * easedProgress;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValueRef.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration, easing]);

    const formattedValue = displayValue.toFixed(decimals);

    // Add thousand separators
    const parts = formattedValue.split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const finalValue = parts.join(".");

    return (
        <span className={className}>
            {prefix}{finalValue}{suffix}
        </span>
    );
}

// Currency-specific animated number with Euro formatting
interface AnimatedCurrencyProps {
    value: number;
    duration?: number;
    className?: string;
    locale?: string;
    currency?: string;
}

export function AnimatedCurrency({
    value,
    duration = 1000,
    className = "",
    locale = "en-IE",
    currency = "EUR",
}: AnimatedCurrencyProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const previousValueRef = useRef(0);
    const animationRef = useRef<number | null>(null);

    useEffect(() => {
        const startValue = previousValueRef.current;
        const endValue = value;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            const currentValue = startValue + (endValue - startValue) * easedProgress;
            setDisplayValue(currentValue);

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animate);
            } else {
                previousValueRef.current = endValue;
            }
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [value, duration]);

    const formatted = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: currency,
    }).format(displayValue);

    return <span className={className}>{formatted}</span>;
}

// Percentage animated number
interface AnimatedPercentageProps {
    value: number;
    duration?: number;
    className?: string;
    decimals?: number;
}

export function AnimatedPercentage({
    value,
    duration = 1000,
    className = "",
    decimals = 0,
}: AnimatedPercentageProps) {
    return (
        <AnimatedNumber
            value={value}
            duration={duration}
            decimals={decimals}
            suffix="%"
            className={className}
        />
    );
}
