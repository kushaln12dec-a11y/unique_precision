import { useState, useEffect, useRef } from "react";

/**
 * Hook for managing timer for each quantity
 * Starts when Start Time is clicked, stops when End Time is clicked
 * Supports pause/resume functionality
 * Displays elapsed time in HH:MM:SS format
 * 
 * The timer shows real-time elapsed time from when Start Time was clicked
 * When paused, it stops counting and tracks pause time separately
 */
export const useQuantityTimer = (
  startTime: string,
  endTime: string,
  isPaused: boolean = false,
  pauseStartTime: number | null = null,
  totalPauseTime: number = 0,
  pausedElapsedTime: number = 0,
  startTimeEpochMs: number | null = null,
  endTimeEpochMs: number | null = null
): { elapsedTime: string; pauseTime: string; isRunning: boolean } => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pauseSeconds, setPauseSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const pauseIntervalRef = useRef<number | null>(null);
  const pauseStartTimeRef = useRef<number | null>(null);

  const parseStartTime = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(" ");
    if (parts.length === 2) {
      const datePart = parts[0].split("/");
      const timePart = parts[1].split(":");
      if (datePart.length === 3 && timePart.length === 2) {
        const day = parseInt(datePart[0], 10) || 0;
        const month = parseInt(datePart[1], 10) || 0;
        const year = parseInt(datePart[2], 10) || 0;
        const hours = parseInt(timePart[0], 10) || 0;
        const minutes = parseInt(timePart[1], 10) || 0;
        const date = new Date(year, month - 1, day, hours, minutes);
        return date.getTime();
      }
    }
    return null;
  };

  const getStartMs = (): number | null => startTimeEpochMs || parseStartTime(startTime);
  const getEndMs = (): number | null => endTimeEpochMs || parseStartTime(endTime);

  useEffect(() => {
    const startMs = getStartMs();
    const endMs = getEndMs();
    setPauseSeconds(totalPauseTime);

    if (!startMs) {
      setIsRunning(false);
      setElapsedSeconds(0);
      return;
    }

    if (endTime && endMs) {
      const elapsedMs = endMs - startMs - (totalPauseTime * 1000);
      setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
      setIsRunning(false);
      return;
    }

    if (isPaused) {
      setElapsedSeconds(Math.max(0, pausedElapsedTime));
      setIsRunning(false);
      return;
    }

    const now = Date.now();
    const elapsedMs = now - startMs - (totalPauseTime * 1000);
    setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
    setIsRunning(true);
  }, [startTime, endTime, isPaused, totalPauseTime, pausedElapsedTime, startTimeEpochMs, endTimeEpochMs]);

  // Handle running timer
  useEffect(() => {
    const startMs = getStartMs();
    if (isRunning && startMs && !isPaused && !endTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startMs - (totalPauseTime * 1000);
        setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, endTime, totalPauseTime, startTimeEpochMs, startTime]);

  // Handle pause timer - show accumulated pause time
  useEffect(() => {
    // Pause timer must never continue after end time is captured.
    if (isPaused && pauseStartTime && !endTime) {
      pauseStartTimeRef.current = pauseStartTime;
      // Update pause timer every second while paused
      pauseIntervalRef.current = setInterval(() => {
        if (pauseStartTimeRef.current) {
          const now = Date.now();
          const pauseMs = now - pauseStartTimeRef.current;
          const currentPauseTime = Math.floor(pauseMs / 1000);
          // Only update if pause time is greater than 0 (avoid showing 00:00:00)
          const newPauseTime = totalPauseTime + currentPauseTime;
          if (newPauseTime > 0) {
            setPauseSeconds(newPauseTime);
          } else {
            setPauseSeconds(0);
          }
        }
      }, 1000);
    } else {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
        pauseIntervalRef.current = null;
      }
      // When not paused, show the total accumulated pause time (only if > 0)
      setPauseSeconds(totalPauseTime > 0 ? totalPauseTime : 0);
    }

    return () => {
      if (pauseIntervalRef.current) {
        clearInterval(pauseIntervalRef.current);
      }
    };
  }, [isPaused, pauseStartTime, totalPauseTime, endTime]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    elapsedTime: formatTime(elapsedSeconds),
    pauseTime: formatTime(pauseSeconds),
    isRunning,
  };
};
