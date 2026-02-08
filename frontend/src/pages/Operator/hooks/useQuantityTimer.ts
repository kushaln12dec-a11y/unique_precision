import { useState, useEffect, useRef } from "react";

/**
 * Hook for managing timer for each quantity
 * Starts when Start Time is clicked, stops when End Time is clicked
 * Displays elapsed time in HH:MM:SS format
 * 
 * The timer shows real-time elapsed time from when Start Time was clicked
 */
export const useQuantityTimer = (
  startTime: string,
  endTime: string
): { elapsedTime: string; isRunning: boolean } => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Parse start time to get timestamp
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
          
          // Create date object - treat as local time (IST)
          const date = new Date(year, month - 1, day, hours, minutes);
          return date.getTime();
        }
      }
      return null;
    };

    // If start time is set and end time is not set, start the timer
    if (startTime && !endTime) {
      const startTimestamp = parseStartTime(startTime);
      if (startTimestamp) {
        // Reset timer if start time changed
        if (!startTimeRef.current || startTimeRef.current !== startTimestamp) {
          startTimeRef.current = startTimestamp;
          setIsRunning(true);
          // Calculate initial elapsed time
          const now = Date.now();
          const elapsedMs = now - startTimestamp;
          setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
        }
      }
    } else if (endTime && startTime) {
      // If end time is set, stop the timer and calculate final elapsed time
      setIsRunning(false);
      const startTimestamp = parseStartTime(startTime);
      const endTimestamp = parseStartTime(endTime);
      if (startTimestamp && endTimestamp) {
        const elapsedMs = endTimestamp - startTimestamp;
        setElapsedSeconds(Math.max(0, Math.floor(elapsedMs / 1000)));
      }
    } else if (!startTime && !endTime) {
      // Reset if both are empty
      setIsRunning(false);
      setElapsedSeconds(0);
      startTimeRef.current = null;
    }
  }, [startTime, endTime]);

  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      // Update timer every second
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedMs = now - startTimeRef.current!;
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
  }, [isRunning]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  return {
    elapsedTime: formatTime(elapsedSeconds),
    isRunning,
  };
};
