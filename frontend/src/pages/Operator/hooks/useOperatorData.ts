import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../../services/userApi";
import { getOperatorJobs } from "../../../services/jobApi";
import type { User } from "../../../types/user";
import type { JobEntry } from "../../../types/job";
import { getUserRoleFromToken } from "../../../utils/auth";
import type { FilterValues } from "../../../components/FilterModal";
import { getOperatorUsers } from "../utils/operatorUserOptions";

/**
 * Hook for fetching and managing operator data
 */
export const useOperatorData = (
  filters: FilterValues,
  customerFilter: string,
  descriptionFilter: string,
  createdByFilter: string,
  assignedToFilter: string,
  searchFilter?: string
) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
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
  const refreshJobs = useCallback(async (): Promise<JobEntry[]> => {
    try {
      setLoadingJobs(true);
      setJobsError("");
      // Uses jobApi for rich filters; prefer operatorApi on detail/simple flows (see jobApi deprecation).
      const fetchedJobs = await getOperatorJobs(
        { ...filters, search: searchFilter },
        customerFilter,
        createdByFilter,
        assignedToFilter,
        descriptionFilter
      );
      setJobs(fetchedJobs);
      return fetchedJobs;
    } catch (error: any) {
      console.error("Failed to fetch jobs", error);
      setJobs([]);
      setJobsError(error?.message || "Failed to fetch operator jobs.");
      return [];
    } finally {
      setLoadingJobs(false);
    }
  }, [assignedToFilter, createdByFilter, customerFilter, descriptionFilter, filters, searchFilter]);

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
    jobsError,
    setJobs,
    operatorUsers,
    users,
    canAssign,
    userRole,
    refreshJobs,
  };
};
