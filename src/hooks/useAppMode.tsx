import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type AppMode = "client" | "provider";

const STORAGE_KEY = "onship:mode";

const ModeContext = createContext<
  { mode: AppMode; setMode: (mode: AppMode) => void; toggleMode: () => void } | undefined
>(undefined);

export function AppModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<AppMode>("client");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "client" || stored === "provider") setModeState(stored);
  }, []);

  const setMode = useCallback((next: AppMode) => {
    setModeState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const next = current === "client" ? "provider" : "client";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode, toggleMode }}>{children}</ModeContext.Provider>
  );
}

export function useAppMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error("useAppMode doit être utilisé dans AppModeProvider");
  return ctx;
}
