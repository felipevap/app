"use client";

import { motion } from "framer-motion";

export default function HomeAnimatedBackdrop() {
    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 bg-[#030712]" />
            <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                    backgroundImage: `
            radial-gradient(ellipse 80% 50% at 50% -20%, rgba(251, 191, 36, 0.45), transparent),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(245, 158, 11, 0.2), transparent),
            radial-gradient(ellipse 50% 30% at 0% 20%, rgba(251, 146, 60, 0.15), transparent)
          `,
                }}
            />
            <svg className="absolute inset-0 h-full w-full opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="pg-grid" width="48" height="48" patternUnits="userSpaceOnUse">
                        <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#pg-grid)" />
            </svg>
            <motion.div
                className="absolute -left-[20%] top-[10%] h-[min(90vw,520px)] w-[min(90vw,520px)] rounded-full bg-amber-500/20 blur-[100px]"
                animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
                className="absolute -right-[15%] top-[35%] h-[min(70vw,420px)] w-[min(70vw,420px)] rounded-full bg-orange-600/15 blur-[90px]"
                animate={{ x: [0, -35, 0], y: [0, 45, 0], scale: [1, 1.12, 1] }}
                transition={{ duration: 22, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.div
                className="absolute bottom-[-10%] left-[25%] h-[min(80vw,480px)] w-[min(80vw,480px)] rounded-full bg-amber-400/10 blur-[110px]"
                animate={{ x: [0, -25, 0], y: [0, -20, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/40 to-slate-950" />
        </div>
    );
}
