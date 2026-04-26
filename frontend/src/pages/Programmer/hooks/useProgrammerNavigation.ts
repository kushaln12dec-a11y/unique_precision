import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { NavigateFunction } from "react-router-dom";

type UseProgrammerNavigationParams = {
  isProgrammerFormRoute: boolean;
  navigate: NavigateFunction;
  handleCancelState: () => void;
  setSavingJob: Dispatch<SetStateAction<boolean>>;
  cancelSave: () => void;
};

const buildRefreshState = () => ({ refreshedAt: Date.now() });

export const useProgrammerNavigation = ({
  isProgrammerFormRoute,
  navigate,
  handleCancelState,
  setSavingJob,
  cancelSave,
}: UseProgrammerNavigationParams) => {
  const navigateToProgrammerList = useCallback(() => {
    navigate("/programmer", {
      replace: true,
      state: buildRefreshState(),
    });
  }, [navigate]);

  const handleProgrammerNavigate = useCallback((path: string) => {
    if (isProgrammerFormRoute) {
      cancelSave();
      setSavingJob(false);
      handleCancelState();
      navigate(path, {
        replace: path === "/programmer",
        state: buildRefreshState(),
      });
      return;
    }

    navigate(path);
  }, [cancelSave, handleCancelState, isProgrammerFormRoute, navigate, setSavingJob]);

  return {
    handleProgrammerNavigate,
    navigateToProgrammerList,
  };
};
