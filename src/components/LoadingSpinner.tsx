"use client";

type LoadingSpinnerProps = {
    className?: string;
    label?: string;
    size?: "sm" | "md" | "lg";
};

const SIZE_CLASSNAMES: Record<NonNullable<LoadingSpinnerProps["size"]>, string> = {
    sm: "h-4 w-4 border-2",
    md: "h-5 w-5 border-2",
    lg: "h-8 w-8 border-[3px]",
};

export default function LoadingSpinner({
    className = "",
    label = "Carregando",
    size = "md",
}: LoadingSpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            className={`inline-block animate-spin rounded-full border-current border-t-transparent ${SIZE_CLASSNAMES[size]} ${className}`.trim()}
        />
    );
}
