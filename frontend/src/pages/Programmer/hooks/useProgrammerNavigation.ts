import { useCallback } from "react";
import type { NavigateFunction } from "react-router-dom";

type UseProgrammerNavigationParams = {
  isProgrammerFormRoute: boolean;
  navigate: NavigateFunction;
  handleCancelState: () => void;
  setSavingJob: React.Dispatch<React.SetStateAction<boolean>>;
};

const buildRefreshState = () => ({ refreshedAt: Date.now() });

export const useProgrammerNavigation = ({
  isProgrammerFormRoute,
  navigate,
  handleCancelState,
  setSavingJob,
}: UseProgrammerNavigationParams) => {
  const navigateToProgrammerList = useCallback(() => {
    setSavingJob(false);
    handleCancelState();
    navigate("/programmer", {
      replace: true,
      state: buildRefreshState(),
    });
  }, [handleCancelState, navigate, setSavingJob]);

  const handleProgrammerNavigate = useCallback((path: string) => {
    if (isProgrammerFormRoute) {
      setSavingJob(false);
      handleCancelState();
      navigate(path, {
        replace: path === "/programmer",
        state: buildRefreshState(),
      });
      return;
    }

    navigate(path);
  }, [handleCancelState, isProgrammerFormRoute, navigate, setSavingJob]);

  return {
    handleProgrammerNavigate,
    navigateToProgrammerList,
  };
};
