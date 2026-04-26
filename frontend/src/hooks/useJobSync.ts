import { useEffect, useRef } from "react";
import { apiUrl } from "../services/apiClient";

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
    const token = localStorage.getItem("token");
    if (!enabled || !token) return;

    const streamUrl = new URL(apiUrl("/api/sse/jobs"));
    streamUrl.searchParams.set("token", token);

    const eventSource = new EventSource(streamUrl.toString());
    const handleUpdate = (event: MessageEvent<string>) => {
      try {
        const payload = JSON.parse(event.data) as JobSyncEvent;
        if (payload?.type === "jobs:updated") {
          onUpdateRef.current(payload);
        }
      } catch (error) {
        console.error("Failed to parse SSE job update", error);
      }
    };

    eventSource.addEventListener("jobs:update", handleUpdate as EventListener);
    eventSource.onerror = () => {
      // Let the browser retry automatically.
    };

    return () => {
      eventSource.removeEventListener("jobs:update", handleUpdate as EventListener);
      eventSource.close();
    };
  }, [enabled]);
};
