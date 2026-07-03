import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { processQueue, getPendingCount } from "../sync/syncQueue";
import { hasSession } from "../api/tokenStore";

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setPendingCount(await getPendingCount());
  }, []);

  const syncNow = useCallback(async () => {
    if (!navigator.onLine || !hasSession()) return;
    setSyncing(true);
    try {
      await processQueue();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    refresh();

    const onChanged = () => refresh();
    const onOnline = () => syncNow();
    const onUnlocked = () => syncNow();

    window.addEventListener("sync:changed", onChanged);
    window.addEventListener("online", onOnline);
    window.addEventListener("applock:unlocked", onUnlocked);

    // Thử đồng bộ ngay khi khởi động (nếu đang online + có phiên).
    syncNow();

    return () => {
      window.removeEventListener("sync:changed", onChanged);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("applock:unlocked", onUnlocked);
    };
  }, [refresh, syncNow]);

  return (
    <SyncContext.Provider value={{ pendingCount, syncing, syncNow }}>
      {children}
    </SyncContext.Provider>
  );
}

export const useSync = () => {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within SyncProvider");
  return ctx;
};
