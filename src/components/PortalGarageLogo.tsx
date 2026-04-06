"use client";

import { useId } from "react";

type Props = {
    className?: string;
    "aria-hidden"?: boolean;
};

export default function PortalGarageLogo({ className = "h-10 w-10", "aria-hidden": ariaHidden }: Props) {
    const id = useId().replace(/:/g, "");
    const gStroke = `pg-stroke-${id}`;
    const gFill = `pg-fill-${id}`;

    return (
        <svg
            className={className}
            viewBox="0 0 48 48"
            fill="none"
            role={ariaHidden ? undefined : "img"}
            aria-hidden={ariaHidden ? true : undefined}
            aria-label={ariaHidden ? undefined : "Portal Garage"}
        >
            <defs>
                <linearGradient id={gStroke} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fde68a" />
                    <stop offset="40%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#b45309" />
                </linearGradient>
                <linearGradient id={gFill} x1="50%" y1="0%" x2="50%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
            </defs>
            <rect x="2" y="2" width="44" height="44" rx="14" fill={`url(#${gFill})`} />
            <rect
                x="2.75"
                y="2.75"
                width="42.5"
                height="42.5"
                rx="13.25"
                stroke={`url(#${gStroke})`}
                strokeWidth="1.5"
                strokeOpacity={0.9}
                fill="none"
            />
            <path
                d="M10 38V22.5Q24 12.5 38 22.5V38"
                stroke={`url(#${gStroke})`}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
            <path
                d="M16 38V28h5v10M27 38V28h5v10"
                stroke={`url(#${gStroke})`}
                strokeWidth="2.25"
                strokeLinecap="round"
            />
            <circle cx="24" cy="33" r="2" fill={`url(#${gStroke})`} opacity={0.95} />
        </svg>
    );
}
