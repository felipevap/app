"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";

interface ToastProps {
    message: string;
    type: "success" | "error" | "info";
    onClose: () => void;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
    cancelLabel?: string;
}

export default function Toast({ message, type, onClose, duration = 3000, action, cancelLabel = "Cancelar" }: ToastProps) {
    useEffect(() => {
        if (!action) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [duration, onClose, action]);

    const colors = {
        success: "bg-green-500",
        error: "bg-red-500",
        info: "bg-blue-500",
    };

    const icons = {
        success: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
        ),
        error: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
        ),
        info: (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
        ),
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.3 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
                className={`fixed top-20 right-4 z-50 flex flex-col w-full max-w-sm overflow-hidden bg-white rounded-lg shadow-md border-l-4 ${type === 'success' ? 'border-green-500' : type === 'error' ? 'border-red-500' : 'border-blue-500'}`}
            >
                <div className="flex items-center">
                    <div className={`flex items-center justify-center w-12 bg-gray-50 flex-shrink-0 py-4 ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                        {icons[type]}
                    </div>
                    <div className="px-4 py-2 -mx-3">
                        <div className="mx-3">
                            <span className={`font-semibold ${type === 'success' ? 'text-green-500' : type === 'error' ? 'text-red-500' : 'text-blue-500'}`}>
                                {type === 'success' ? 'Sucesso' : type === 'error' ? 'Erro' : 'Info'}
                            </span>
                            <p className="text-sm text-gray-600">{message}</p>
                        </div>
                    </div>
                </div>
                {action && (
                    <div className="flex justify-end gap-2 bg-gray-50 p-2">
                        <button
                            onClick={onClose}
                            className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded"
                        >
                            {cancelLabel}
                        </button>
                        <button
                            onClick={() => {
                                action.onClick();
                                onClose();
                            }}
                            className={`px-3 py-1 text-sm font-bold text-white rounded ${type === 'success' ? 'bg-green-500 hover:bg-green-600' : type === 'error' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
                        >
                            {action.label}
                        </button>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
