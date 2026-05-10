import { useCallback, type Dispatch, type SetStateAction } from "react";
import { useLocation, type NavigateFunction } from "react-router-dom";

type UseProgrammerNavigationParams = {
  isProgrammerFormRoute: boolean;
  navigate: NavigateFunction;
  handleCancelState: () => void;
  setSavingJob: Dispatch<SetStateAction<boolean>>;
  cancelSave: () => void;
};

const buildRefreshState = () => ({ refreshedAt: Date.now() });

const isFormPath = (pathname: string) =>
  pathname.startsWith("/programmer/newjob") ||
  pathname.startsWith("/programmer/edit/") ||
  pathname.startsWith("/programmer/clone/");

export const useProgrammerNavigation = ({
  navigate,
  handleCancelState,
  setSavingJob,
  cancelSave,
}: UseProgrammerNavigationParams) => {
  const location = useLocation();

  const navigateToProgrammerList = useCallback(() => {
    cancelSave();
    setSavingJob(false);
    handleCancelState();
    navigate("/programmer", {
      replace: true,
      state: buildRefreshState(),
    });
  }, [cancelSave, handleCancelState, navigate, setSavingJob]);

  const handleProgrammerNavigate = useCallback((path: string) => {
    // Read pathname at call time to avoid stale closures
    const currentlyOnForm = isFormPath(location.pathname);

    if (currentlyOnForm) {
      cancelSave();
      setSavingJob(false);
      handleCancelState();
    }

    navigate(path, {
      replace: currentlyOnForm && path === "/programmer",
      state: buildRefreshState(),
    });
  }, [cancelSave, handleCancelState, location.pathname, navigate, setSavingJob]);

  return {
    handleProgrammerNavigate,
    navigateToProgrammerList,
  };
};
