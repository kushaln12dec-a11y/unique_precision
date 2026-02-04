import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../../../services/userApi";
import { getJobs } from "../../../services/jobApi";
import type { User } from "../../../types/user";
import type { JobEntry } from "../../../types/job";
import { getUserRoleFromToken } from "../../../utils/auth";
import type { FilterValues } from "../../../components/FilterModal";

const STORAGE_KEY = "programmerJobs";

/**
 * Hook for fetching and managing operator data
 */
export const useOperatorData = (
  filters: FilterValues,
  customerFilter: string,
  createdByFilter: string,
  assignedToFilter: string
) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [operatorUsers, setOperatorUsers] = useState<User[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  const userRole = getUserRoleFromToken();
  const canAssign = userRole === "ADMIN" || userRole === "OPERATOR";

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const fetchedJobs = await getJobs(filters, customerFilter, createdByFilter, assignedToFilter);
        setJobs(fetchedJobs);
      } catch (error) {
        console.error("Failed to fetch jobs", error);
        // Fallback to localStorage if API fails
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as JobEntry[];
            if (Array.isArray(parsed)) {
              setJobs(
                parsed.map((job) => ({
                  ...job,
                  assignedTo: job.assignedTo || "Unassigned",
                }))
              );
            }
          } catch (parseError) {
            console.error("Failed to parse jobs from storage", parseError);
          }
        }
      }
    };
    fetchJobs();
  }, [filters, customerFilter, createdByFilter, assignedToFilter]);

  useEffect(() => {
    const fetchOperators = async () => {
      try {
        const userList = await getUsers();
        setOperatorUsers(userList.filter((user) => user.role === "OPERATOR" || user.role === "ADMIN"));
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
          const userList = await getUsers(["ADMIN", "PROGRAMMER"]);
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
    setJobs,
    operatorUsers,
    users,
    canAssign,
    userRole,
  };
};
