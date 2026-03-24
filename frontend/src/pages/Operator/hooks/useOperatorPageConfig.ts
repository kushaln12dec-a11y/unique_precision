import { useEffect, useMemo, useState } from "react";
import { getMasterConfig } from "../../../services/masterConfigApi";
import type { MasterConfig } from "../../../types/masterConfig";
import { MACHINE_OPTIONS, getDisplayName, toMachineIndex } from "../../../utils/jobFormatting";

export const useOperatorPageConfig = (
  operatorUsers: Array<{ _id: string; firstName?: string; lastName?: string; email?: string }>,
  currentUserDisplayName: string,
  userRole: string
) => {
  const [masterConfig, setMasterConfig] = useState<MasterConfig | null>(null);

  useEffect(() => {
    void getMasterConfig().then(setMasterConfig).catch((error) => console.error("Failed to fetch master config", error));
  }, []);

  const operatorOptionUsers = useMemo(
    () =>
      operatorUsers.map((user) => ({
        id: user._id,
        name: getDisplayName(user.firstName, user.lastName, user.email, String(user._id)),
      })),
    [operatorUsers]
  );

  const machineOptionsForDropdown = useMemo(() => {
    const configured = ((masterConfig?.machineOptions || []).map((value) => toMachineIndex(value)).filter(Boolean) || []) as string[];
    return configured.length > 0 ? configured : [...MACHINE_OPTIONS];
  }, [masterConfig]);

  return {
    currentUserDisplayName,
    isAdmin: userRole === "ADMIN",
    canUseTaskSwitchTimer: userRole === "ADMIN" || userRole === "OPERATOR",
    operatorOptionUsers,
    machineOptionsForDropdown,
  };
};
