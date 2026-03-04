import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getUserIdFromToken, getUserRoleFromToken } from '../../../utils/auth';

type TaskSwitchPayload = {
  idleTime: string;
  remark: string;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
};

type OperatorTaskTimerProps = {
  onSaveTaskSwitch: (payload: TaskSwitchPayload) => Promise<void>;
  onShowToast: (
    message: string,
    variant?: 'success' | 'error' | 'info',
  ) => void;
  onRunningChange?: (running: boolean) => void;
};

export const OperatorTaskTimer: React.FC<OperatorTaskTimerProps> = ({
  onSaveTaskSwitch,
  onShowToast,
  onRunningChange,
}) => {
  const timerContainerRef = useRef<HTMLDivElement | null>(null);
  const TIMER_STORAGE_KEY = useMemo(() => {
    const role = (getUserRoleFromToken() || 'UNKNOWN').toUpperCase();
    const userId = getUserIdFromToken() || 'ANON';
    return `operator_task_switch_timer_v2_${role}_${userId}`;
  }, []);

  const persistedState = useMemo(() => {
    try {
      const raw = localStorage.getItem(TIMER_STORAGE_KEY);
      if (!raw) {
        return {
          running: false,
          startedAt: null as number | null,
          reason: '',
          otherReason: '',
          remark: '',
          panelOpen: false,
        };
      }
      const parsed = JSON.parse(raw) as {
        running?: boolean;
        startedAt?: number | null;
        reason?: string;
        otherReason?: string;
        remark?: string;
        panelOpen?: boolean;
      };
      const startedAt =
        typeof parsed.startedAt === 'number'
          ? parsed.startedAt
          : parsed.startedAt
            ? Number(parsed.startedAt)
            : null;
      const running = Boolean(parsed.running && startedAt);
      return {
        running,
        startedAt,
        reason: String(parsed.reason || ''),
        otherReason: String(parsed.otherReason || ''),
        remark: String(parsed.remark || ''),
        panelOpen: Boolean(parsed.panelOpen || running),
      };
    } catch {
      return {
        running: false,
        startedAt: null as number | null,
        reason: '',
        otherReason: '',
        remark: '',
        panelOpen: false,
      };
    }
  }, [TIMER_STORAGE_KEY]);

  const [timerRunning, setTimerRunning] = useState<boolean>(
    persistedState.running,
  );
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(
    persistedState.startedAt,
  );
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(
    persistedState.running && persistedState.startedAt
      ? Math.max(0, Math.floor((Date.now() - persistedState.startedAt) / 1000))
      : 0,
  );
  const [timerPanelOpen, setTimerPanelOpen] = useState<boolean>(
    persistedState.panelOpen,
  );
  const [savingTimer, setSavingTimer] = useState(false);
  const [idleReason, setIdleReason] = useState<string>(persistedState.reason);
  const [otherIdleReason, setOtherIdleReason] = useState<string>(
    persistedState.otherReason,
  );
  const [remark, setRemark] = useState<string>(persistedState.remark);

  useEffect(() => {
    onRunningChange?.(timerRunning);
  }, [timerRunning, onRunningChange]);

  useEffect(() => {
    try {
      localStorage.setItem(
        TIMER_STORAGE_KEY,
        JSON.stringify({
          running: timerRunning,
          startedAt: timerStartedAt,
          reason: idleReason,
          otherReason: otherIdleReason,
          remark,
          panelOpen: timerPanelOpen,
        }),
      );
    } catch {
      // Ignore local storage write issues
    }
  }, [
    TIMER_STORAGE_KEY,
    timerRunning,
    timerStartedAt,
    idleReason,
    otherIdleReason,
    remark,
    timerPanelOpen,
  ]);

  useEffect(() => {
    if (!timerRunning || !timerStartedAt) return;
    const id = window.setInterval(() => {
      setElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)),
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, [timerRunning, timerStartedAt]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== TIMER_STORAGE_KEY || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as {
          running?: boolean;
          startedAt?: number | null;
          reason?: string;
          otherReason?: string;
          remark?: string;
          panelOpen?: boolean;
        };
        const startedAt =
          typeof parsed.startedAt === 'number'
            ? parsed.startedAt
            : parsed.startedAt
              ? Number(parsed.startedAt)
              : null;
        const running = Boolean(parsed.running && startedAt);
        setTimerRunning(running);
        setTimerStartedAt(startedAt);
        setIdleReason(String(parsed.reason || ''));
        setOtherIdleReason(String(parsed.otherReason || ''));
        setRemark(String(parsed.remark || ''));
        setTimerPanelOpen(Boolean(parsed.panelOpen || running));
        if (running && startedAt) {
          setElapsedSeconds(
            Math.max(0, Math.floor((Date.now() - startedAt) / 1000)),
          );
        }
      } catch {
        // Ignore sync errors
      }
    };
    const onVisibilityOrFocus = () => {
      if (timerRunning && timerStartedAt) {
        setElapsedSeconds(
          Math.max(0, Math.floor((Date.now() - timerStartedAt) / 1000)),
        );
      }
    };
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [TIMER_STORAGE_KEY, timerRunning, timerStartedAt]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!timerContainerRef.current) return;
      if (!timerContainerRef.current.contains(event.target as Node)) {
        setTimerPanelOpen(false);
      }
    };
    if (timerPanelOpen) {
      document.addEventListener('mousedown', onClickOutside);
    }
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [timerPanelOpen]);

  const formatTimer = (totalSeconds: number): string => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  };

  const handleTimerButtonClick = () => {
    if (!timerRunning) {
      const startedAt = Date.now();
      setTimerRunning(true);
      setTimerStartedAt(startedAt);
      setElapsedSeconds(0);
      setTimerPanelOpen(true);
      return;
    }
    setTimerPanelOpen((prev) => !prev);
  };

  const handleSaveAndStopTimer = async () => {
    if (!timerRunning || !timerStartedAt) {
      onShowToast('Start timer first.', 'error');
      return;
    }
    if (!idleReason.trim()) {
      onShowToast('Please select idle reason.', 'error');
      return;
    }
    if (idleReason === 'Others' && !otherIdleReason.trim()) {
      onShowToast('Please enter other reason.', 'error');
      return;
    }
    if (!remark.trim()) {
      onShowToast('Remark is required.', 'error');
      return;
    }

    const endedAtMs = Date.now();
    const durationSeconds = Math.max(
      0,
      Math.floor((endedAtMs - timerStartedAt) / 1000),
    );
    const finalReason =
      idleReason === 'Others' ? otherIdleReason.trim() : idleReason.trim();

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
      setIdleReason('');
      setOtherIdleReason('');
      setRemark('');
      localStorage.removeItem(TIMER_STORAGE_KEY);
      onShowToast('Timer saved successfully.', 'success');
    } catch (error: any) {
      onShowToast(error?.message || 'Failed to save timer.', 'error');
    } finally {
      setSavingTimer(false);
    }
  };

  return (
    <div
      className="filter-group operator-inline-timer-group"
      ref={timerContainerRef}
    >
      <label
        htmlFor="operator-task-switch-timer-btn"
        className="operator-inline-timer-label"
      >
        Task Timer
      </label>
      <div className="operator-inline-timer-anchor">
        <button
          id="operator-task-switch-timer-btn"
          type="button"
          className={`operator-inline-timer-btn ${timerRunning ? 'running' : ''}`}
          onClick={handleTimerButtonClick}
          aria-label="Task switch timer"
          title={timerRunning ? 'Open timer details' : 'Start timer'}
        >
          <span className="operator-inline-timer-icon" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle
                cx="12"
                cy="12"
                r="8"
                stroke="currentColor"
                strokeWidth="2"
              />
              <path
                d="M12 8V12L15 14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="operator-inline-timer-text">
            {formatTimer(elapsedSeconds)}
          </span>
        </button>
      </div>
      {timerPanelOpen && (
        <div className="operator-inline-timer-panel">
          <div className="operator-inline-timer-panel-head">
            <span>Task Switch Timer</span>
            <span className="live">{formatTimer(elapsedSeconds)}</span>
          </div>
          <div className="filter-group">
            <label htmlFor="operator-idle-reason">Idle Time</label>
            <select
              id="operator-idle-reason"
              value={idleReason}
              onChange={(e) => setIdleReason(e.target.value)}
              className="filter-select"
            >
              <option value="">Select</option>
              <option value="Power Break">Power Break</option>
              <option value="Shift Over">Shift Over</option>
              <option value="Machine Breakdown">Machine Breakdown</option>
              <option value="Vertical Dial">Vertical Dial</option>
              <option value="Cleaning">Cleaning</option>
              <option value="Consumables Change">Consumables Change</option>
              <option value="Others">Others</option>
            </select>
          </div>
          {idleReason === 'Others' && (
            <div className="filter-group">
              <label htmlFor="operator-idle-other-reason">Other Reason</label>
              <input
                id="operator-idle-other-reason"
                type="text"
                value={otherIdleReason}
                onChange={(e) => setOtherIdleReason(e.target.value)}
                placeholder="Enter reason..."
                className="filter-input operator-inline-timer-input"
              />
            </div>
          )}
          <div className="filter-group">
            <label htmlFor="operator-idle-remark">Remark</label>
            <input
              id="operator-idle-remark"
              type="text"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Enter remark..."
              className="filter-input operator-inline-timer-input"
            />
          </div>
          <div className="operator-inline-timer-actions">
            <button
              type="button"
              className="operator-inline-timer-save-btn"
              onClick={handleSaveAndStopTimer}
              disabled={savingTimer}
            >
              {savingTimer ? 'Saving...' : 'Save & Stop'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
