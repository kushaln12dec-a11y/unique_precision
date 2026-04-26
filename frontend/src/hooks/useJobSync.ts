import { useEffect, useRef } from "react";
import { getAppSocket } from "../services/socket";

export type JobSyncEvent = {
  type: "jobs:updated";
  groupId?: string;
  jobId?: string;
  updatedBy?: string;
  updatedAt: string;
  source?: string;
};

export const useJobSync = (onUpdate: (event: JobSyncEvent) => void, enabled: boolean = true) => {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;

  useEffect(() => {
    if (!enabled) return;

    const socket = getAppSocket();
    if (!socket) return;

    const handleUpdate = (payload: JobSyncEvent) => {
      if (payload?.type === "jobs:updated") {
        onUpdateRef.current(payload);
      }
    };

    const handleConnect = () => {
      socket.emit("jobs:sync");
    };

    socket.on("jobs:updated", handleUpdate);
    socket.on("connect", handleConnect);

    return () => {
      socket.off("jobs:updated", handleUpdate);
      socket.off("connect", handleConnect);
    };
  }, [enabled]);
};
