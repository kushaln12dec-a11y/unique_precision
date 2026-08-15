import { useEffect, useRef } from "react";
import { updateOperatorJob } from "../../../services/operatorApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { buildStableOperatorList, parseAssignedOperators } from "../utils/operatorViewPageHelpers";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();
const normalizeMachineNumber = (value: unknown) => String(value || "").trim().toUpperCase();

const buildStableMachineList = (machines: string[]) =>
  Array.from(
    new Map(
      machines
        .map((machine) => normalizeMachineNumber(machine))
        .filter(Boolean)
        .map((machine) => [machine.toLowerCase(), machine] as const)
    ).values()
  ).sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

type Params = {
  allowedOperatorUsers: Array<{ id: string | number; name: string }>;
  canEditAssignments: boolean;
  cutInputs: Map<number | string, CutInputData>;
  currentUserDisplayName: string;
  jobs: JobEntry[];
  setJobs: React.Dispatch<React.SetStateAction<JobEntry[]>>;
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>;
  userRole: string;
  reloadInFlightRef?: React.MutableRefObject<Promise<void> | null>;
};

export const useOperatorAssignmentSync = ({
  allowedOperatorUsers,
  canEditAssignments,
  cutInputs,
  currentUserDisplayName,
  jobs,
  setJobs,
  setCutInputs,
  userRole,
  reloadInFlightRef,
}: Params) => {
  const pendingAssignmentSyncRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (allowedOperatorUsers.length === 0 || cutInputs.size === 0) return;

    const allowedNames = new Map(
      allowedOperatorUsers.map((operator) => {
        const name = normalizeOperatorName(operator.name);
        return [name.toLowerCase(), name] as const;
      })
    );

    setCutInputs((prev) => {
      let hasChanged = false;
      const next = new Map(prev);

      prev.forEach((cutData, cutId) => {
        const nextQuantities = (cutData.quantities || []).map((quantity) => {
          const sanitizedOps = (Array.isArray(quantity.opsName) ? quantity.opsName : [])
            .map((name) => allowedNames.get(normalizeOperatorName(name).toLowerCase()) || "")
            .filter(Boolean);

          const uniqueSanitizedOps = Array.from(new Set(sanitizedOps));
          const currentOpsSnapshot = JSON.stringify(Array.isArray(quantity.opsName) ? quantity.opsName : []);
          const nextOpsSnapshot = JSON.stringify(uniqueSanitizedOps);
          if (currentOpsSnapshot === nextOpsSnapshot) return quantity;

          hasChanged = true;
          return {
            ...quantity,
            opsName: uniqueSanitizedOps,
          };
        });

        if (hasChanged) {
          next.set(cutId, {
            ...cutData,
            quantities: nextQuantities,
          });
        }
      });

      return hasChanged ? next : prev;
    });
  }, [allowedOperatorUsers, cutInputs.size, setCutInputs]);

  useEffect(() => {
    if (!canEditAssignments || jobs.length === 0 || cutInputs.size === 0) return;
    if (reloadInFlightRef?.current) return;

    const timeoutId = window.setTimeout(() => {
      if (reloadInFlightRef?.current) return;

      jobs.forEach((job) => {
        const cutData = cutInputs.get(job.id);
        if (!cutData) return;

        const namesFromInputs = Array.from(
          new Map(
            (cutData.quantities || [])
              .flatMap((quantity) => (Array.isArray(quantity.opsName) ? quantity.opsName : []))
              .map((name) => {
                const normalized = normalizeOperatorName(name);
                return [normalized.toLowerCase(), normalized] as const;
              })
              .filter((entry) => entry[1])
          ).values()
        );

        const nextMachineNumber = buildStableMachineList(
          (cutData.quantities || []).map((quantity) => String(quantity.machineNumber || "").trim())
        ).join(", ");

        const validOperatorNames = new Map(
          allowedOperatorUsers.map((operator) => {
            const name = normalizeOperatorName(operator.name);
            return [name.toLowerCase(), name] as const;
          })
        );
        const currentAssignedOperators = parseAssignedOperators(job.assignedTo || "").filter((name) =>
          validOperatorNames.has(normalizeOperatorName(name).toLowerCase())
        );
        const normalizedCurrentUser = String(currentUserDisplayName || "").trim().toLowerCase();

        const nextAssignedOperators =
          userRole === "OPERATOR" && normalizedCurrentUser
            ? (() => {
                const retainedOthers = currentAssignedOperators.filter((name) => name.toLowerCase() !== normalizedCurrentUser);
                const hasSelfSelected = namesFromInputs.some((name) => name.toLowerCase() === normalizedCurrentUser);
                return hasSelfSelected
                  ? [...retainedOthers, currentUserDisplayName]
                  : retainedOthers;
              })()
            : namesFromInputs;

        const stableNextAssignedOperators = buildStableOperatorList(nextAssignedOperators);
        const stableCurrentAssignedOperators = buildStableOperatorList(currentAssignedOperators);
        const nextAssignedTo = stableNextAssignedOperators.join(", ") || "Unassign";
        const currentAssignedTo = stableCurrentAssignedOperators.join(", ") || "Unassign";
        const syncSignature = `${nextAssignedTo}|${nextMachineNumber}`;
        const jobId = String(job.id);

        if (currentAssignedTo === nextAssignedTo && String(job.machineNumber || "").trim() === nextMachineNumber) {
          pendingAssignmentSyncRef.current.delete(jobId);
          return;
        }

        if (pendingAssignmentSyncRef.current.get(jobId) === syncSignature) {
          return;
        }

        pendingAssignmentSyncRef.current.set(jobId, syncSignature);
        const previousAssignedTo = String(job.assignedTo || "").trim() || "Unassign";
        const previousMachineNumber = String(job.machineNumber || "").trim();

        setJobs((prev) =>
          prev.map((entry) =>
            String(entry.id) === jobId
              ? {
                  ...entry,
                  assignedTo: nextAssignedTo,
                  machineNumber: nextMachineNumber,
                }
              : entry
          )
        );

        void updateOperatorJob(String(job.id), {
          assignedTo: nextAssignedTo,
          machineNumber: nextMachineNumber,
        }).catch(() => {
          pendingAssignmentSyncRef.current.delete(jobId);
          setJobs((prev) =>
            prev.map((entry) =>
              String(entry.id) === jobId &&
              String(entry.assignedTo || "").trim() === nextAssignedTo &&
              String(entry.machineNumber || "").trim() === nextMachineNumber
                ? {
                    ...entry,
                    assignedTo: previousAssignedTo,
                    machineNumber: previousMachineNumber,
                  }
                : entry
            )
          );
        });
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [allowedOperatorUsers, canEditAssignments, cutInputs, currentUserDisplayName, jobs, reloadInFlightRef, setJobs, userRole]);
};
