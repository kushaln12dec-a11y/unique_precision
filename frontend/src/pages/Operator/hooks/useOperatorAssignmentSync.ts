import { useEffect, useRef } from "react";
import { updateOperatorJob } from "../../../services/operatorApi";
import type { JobEntry } from "../../../types/job";
import type { CutInputData } from "../types/cutInput";
import { buildStableOperatorList, parseAssignedOperators } from "../utils/operatorViewPageHelpers";

const normalizeOperatorName = (value: unknown) => String(value || "").trim().toUpperCase();

type Params = {
  allowedOperatorUsers: Array<{ id: string | number; name: string }>;
  canEditAssignments: boolean;
  cutInputs: Map<number | string, CutInputData>;
  currentUserDisplayName: string;
  jobs: JobEntry[];
  setCutInputs: React.Dispatch<React.SetStateAction<Map<number | string, CutInputData>>>;
  userRole: string;
};

export const useOperatorAssignmentSync = ({
  allowedOperatorUsers,
  canEditAssignments,
  cutInputs,
  currentUserDisplayName,
  jobs,
  setCutInputs,
  userRole,
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

    const timeoutId = window.setTimeout(() => {
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

        const nextMachineNumber =
          (cutData.quantities || [])
            .map((quantity) => String(quantity.machineNumber || "").trim())
            .find(Boolean) || "";

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

        void updateOperatorJob(String(job.id), {
          assignedTo: nextAssignedTo,
          machineNumber: nextMachineNumber,
        }).catch(() => {
          pendingAssignmentSyncRef.current.delete(jobId);
        });
      });
    }, 400);

    return () => window.clearTimeout(timeoutId);
  }, [allowedOperatorUsers, canEditAssignments, cutInputs, currentUserDisplayName, jobs, userRole]);
};
