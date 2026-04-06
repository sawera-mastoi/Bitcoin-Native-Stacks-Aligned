"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading" | "default";

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastType;
}

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastType;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(({ title, description, variant = "default" }: ToastOptions) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, title, description, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className={`p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-center gap-4 min-w-[320px] ${
                t.variant === "success" ? "bg-green-500/10 border-green-500/20 text-green-500" :
                t.variant === "error" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                t.variant === "loading" ? "bg-blue-500/10 border-blue-500/20 text-[#5546FF]" :
                "bg-black/60 border-white/10 text-white"
              }`}>
                <div className="flex-shrink-0">
                    {t.variant === "success" && <CheckCircle2 className="w-6 h-6" />}
                    {t.variant === "error" && <AlertCircle className="w-6 h-6" />}
                    {t.variant === "loading" && <div className="w-6 h-6 border-4 border-current border-t-transparent rounded-full animate-spin" />}
                    {(t.variant === "info" || t.variant === "default") && <Info className="w-6 h-6" />}
                </div>
                <div className="flex-grow">
                  <p className="text-[10px] font-black uppercase tracking-widest">{t.title}</p>
                  {t.description && <p className="text-[9px] opacity-70 mt-1 font-bold uppercase tracking-wider">{t.description}</p>}
                </div>
                <button
                    onClick={() => removeToast(t.id)}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors ml-auto"
                    aria-label="Close notification"
                >
                  <X className="w-4 h-4 opacity-50 hover:opacity-100 transition-opacity" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
