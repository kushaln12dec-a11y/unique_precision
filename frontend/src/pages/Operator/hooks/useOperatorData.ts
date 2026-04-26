import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../../services/userApi";
import { getOperatorJobs } from "../../../services/jobApi";
import type { User } from "../../../types/user";
import type { JobEntry } from "../../../types/job";
import { getUserRoleFromToken } from "../../../utils/auth";
import type { FilterValues } from "../../../components/FilterModal";
import { getOperatorUsers } from "../utils/operatorUserOptions";

const STORAGE_KEY = "programmerJobs";

/**
 * Hook for fetching and managing operator data
 */
export const useOperatorData = (
  filters: FilterValues,
  customerFilter: string,
  descriptionFilter: string,
  createdByFilter: string,
  assignedToFilter: string
) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [operatorUsers, setOperatorUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const userRole = (getUserRoleFromToken() || "").toUpperCase();
  const canAssign = userRole === "ADMIN" || userRole === "PROGRAMMER" || userRole === "OPERATOR";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  const refreshJobs = useCallback(async () => {
    try {
      setLoadingJobs(true);
      const fetchedJobs = await getOperatorJobs(
        filters,
        customerFilter,
        createdByFilter,
        assignedToFilter,
        descriptionFilter
      );
      setJobs(fetchedJobs);
    } catch (error) {
      console.error("Failed to fetch jobs", error);
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as JobEntry[];
          if (Array.isArray(parsed)) {
            setJobs(
              parsed.map((job) => ({
                ...job,
                assignedTo: job.assignedTo || "Unassign",
              }))
            );
          }
        } catch (parseError) {
          console.error("Failed to parse jobs from storage", parseError);
        }
      }
    } finally {
      setLoadingJobs(false);
    }
  }, [assignedToFilter, createdByFilter, customerFilter, descriptionFilter, filters]);

  useEffect(() => {
    void refreshJobs();
  }, [refreshJobs]);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const userList = await getUsers();
        setOperatorUsers(getOperatorUsers(userList));
        setUsers(userList);
      } catch (error) {
        console.error("Failed to fetch operators", error);
      }
    };
    if (canAssign) {
      fetchOperators();
    } else {
      const fetchUsers = async () => {
        try {
          // Fetch only ADMIN and PROGRAMMER users for Created By filter
          const userList = await getUsers(["ADMIN", "ACCOUNTANT", "PROGRAMMER"]);
          setUsers(userList);
        } catch (error) {
          console.error("Failed to fetch users", error);
        }
      };
      fetchUsers();
    }
  }, [canAssign]);

  return {
    jobs,
    loadingJobs,
    setJobs,
    operatorUsers,
    users,
    canAssign,
    userRole,
    refreshJobs,
  };
};
