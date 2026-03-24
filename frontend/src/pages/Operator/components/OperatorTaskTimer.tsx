import React, { useEffect, useMemo, useRef, useState } from "react";
import OperatorTaskTimerConfirm from "./OperatorTaskTimerConfirm";
import OperatorTaskTimerPanel from "./OperatorTaskTimerPanel";
import { formatTaskTimer, getOperatorTaskTimerStorageKey, readPersistedTimerState } from "../utils/operatorTaskTimerUtils";

type TaskSwitchPayload = {
  idleTime: string;
  remark: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

type OperatorTaskTimerProps = {
  onSaveTaskSwitch: (payload: TaskSwitchPayload) => Promise<void>;
  onShowToast: (message: string, variant?: "success" | "error" | "info") => void;
  onRunningChange?: (running: boolean) => void;
};

export const OperatorTaskTimer: React.FC<OperatorTaskTimerProps> = ({ onSaveTaskSwitch, onShowToast, onRunningChange }) => {
  const timerContainerRef = useRef<HTMLDivElement | null>(null);
  const storageKey = useMemo(() => getOperatorTaskTimerStorageKey(), []);
  const persistedState = useMemo(() => readPersistedTimerState(storageKey), [storageKey]);
  const [timerRunning, setTimerRunning] = useState<boolean>(persistedState.running);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(persistedState.startedAt);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(persistedState.running && persistedState.startedAt ? Math.max(0, Math.floor((Date.now() - persistedState.startedAt) / 1000)) : 0);
  const [timerPanelOpen, setTimerPanelOpen] = useState<boolean>(persistedState.panelOpen);
  const [savingTimer, setSavingTimer] = useState(false);
  const [confirmStartOpen, setConfirmStartOpen] = useState(false);
  const [idleReason, setIdleReason] = useState<string>(persistedState.reason);
  const [otherIdleReason, setOtherIdleReason] = useState<string>(persistedState.otherReason);
  const [remark, setRemark] = useState<string>(persistedState.remark);

  useEffect(() => {
    onRunningChange?.(timerRunning);
  }, [timerRunning, onRunningChange]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        running: timerRunning,
        startedAt: timerStartedAt,
        reason: idleReason,
        otherReason: otherIdleReason,
        remark,
        panelOpen: timerPanelOpen,
      }));
    } catch {}
  }, [storageKey, timerRunning, timerStartedAt, idleReason, otherIdleReason, remark, timerPanelOpen]);

  useEffect(() => {
    if (!timerRunning || !timerStartedAt) return;
    const id = window.setInterval(() => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000))), 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerStartedAt]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== storageKey || !event.newValue) return;
      const parsed = readPersistedTimerState(storageKey);
      setTimerRunning(parsed.running);
      setTimerStartedAt(parsed.startedAt);
      setIdleReason(parsed.reason);
      setOtherIdleReason(parsed.otherReason);
      setRemark(parsed.remark);
      setTimerPanelOpen(parsed.panelOpen);
      if (parsed.running && parsed.startedAt) {
        setElapsedSeconds(Math.max(0, Math.floor((Date.now() - parsed.startedAt) / 1000)));
      }
    };
    const refreshElapsed = () => {
      if (timerRunning && timerStartedAt) setElapsedSeconds(Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)));
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", refreshElapsed);
    window.addEventListener("focus", refreshElapsed);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", refreshElapsed);
      window.removeEventListener("focus", refreshElapsed);
    };
  }, [storageKey, timerRunning, timerStartedAt]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (timerContainerRef.current && !timerContainerRef.current.contains(event.target as Node)) setTimerPanelOpen(false);
    };
    if (timerPanelOpen) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [timerPanelOpen]);

  const handleSaveAndStopTimer = async () => {
    if (!timerRunning || !timerStartedAt) return onShowToast("Start timer first.", "error");
    if (!idleReason.trim()) return onShowToast("Please select idle reason.", "error");
    if (idleReason === "Others" && !otherIdleReason.trim()) return onShowToast("Please enter other reason.", "error");
    if (!remark.trim()) return onShowToast("Remark is required.", "error");

    const endedAtMs = Date.now();
    const durationSeconds = Math.max(0, Math.floor((endedAtMs - timerStartedAt) / 1000));
    const finalReason = idleReason === "Others" ? otherIdleReason.trim() : idleReason.trim();
    try {
      setSavingTimer(true);
      await onSaveTaskSwitch({
        idleTime: finalReason,
        remark: remark.trim(),
        startedAt: new Date(timerStartedAt).toISOString(),
        endedAt: new Date(endedAtMs).toISOString(),
        durationSeconds,
      });
      setTimerRunning(false);
      setTimerStartedAt(null);
      setElapsedSeconds(0);
      setTimerPanelOpen(false);
      setIdleReason("");
      setOtherIdleReason("");
      setRemark("");
      localStorage.removeItem(storageKey);
      onShowToast("Timer saved successfully.", "success");
    } catch (error: any) {
      onShowToast(error?.message || "Failed to save timer.", "error");
    } finally {
      setSavingTimer(false);
    }
  };

  return (
    <div className="filter-group operator-inline-timer-group" ref={timerContainerRef}>
      <label htmlFor="operator-task-switch-timer-btn" className="operator-inline-timer-label">Task Timer</label>
      <div className="operator-inline-timer-anchor">
        <button
          id="operator-task-switch-timer-btn"
          type="button"
          className={`operator-inline-timer-btn ${timerRunning ? "running" : ""}`}
          onClick={() => {
            if (!timerRunning) return setConfirmStartOpen(true);
            setTimerPanelOpen((prev) => !prev);
          }}
          aria-label="Task switch timer"
          title={timerRunning ? "Open timer details" : "Start timer"}
        >
          <span className="operator-inline-timer-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8V12L15 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
          <span className="operator-inline-timer-text">{formatTaskTimer(elapsedSeconds)}</span>
        </button>
      </div>
      {timerPanelOpen && (
        <OperatorTaskTimerPanel
          elapsedText={formatTaskTimer(elapsedSeconds)}
          idleReason={idleReason}
          otherIdleReason={otherIdleReason}
          remark={remark}
          savingTimer={savingTimer}
          onIdleReasonChange={setIdleReason}
          onOtherReasonChange={setOtherIdleReason}
          onRemarkChange={setRemark}
          onSave={handleSaveAndStopTimer}
        />
      )}
      <OperatorTaskTimerConfirm
        isOpen={confirmStartOpen}
        onCancel={() => setConfirmStartOpen(false)}
        onConfirm={() => {
          const startedAt = Date.now();
          setTimerRunning(true);
          setTimerStartedAt(startedAt);
          setElapsedSeconds(0);
          setTimerPanelOpen(true);
          setConfirmStartOpen(false);
        }}
      />
    </div>
  );
};
