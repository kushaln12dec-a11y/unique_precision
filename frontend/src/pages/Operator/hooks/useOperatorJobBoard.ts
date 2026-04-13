import { useCallback } from "react";
import { getOperatorJobsPage } from "../../../services/jobApi";
import type { JobEntry } from "../../../types/job";
import { fetchAllPaginatedItems } from "../../../utils/paginationUtils";
import type { OperatorTableRow } from "../types";
import { exportOperatorJobsToCSV } from "../utils/csvExport";

const SEARCH_FETCH_PAGE_SIZE = 100;

export const useOperatorJobBoard = ({
  assignedToFilter,
  createdByFilter,
  customerFilter,
  descriptionFilter,
  filters,
  hasJobSearch,
  filteredGridTableData,
  isAdmin,
}: {
  assignedToFilter: string;
  createdByFilter: string;
  customerFilter: string;
  descriptionFilter: string;
  filters: Record<string, string[]>;
  hasJobSearch: boolean;
  filteredGridTableData: OperatorTableRow[];
  isAdmin: boolean;
}) => {
  const handleDownloadCSV = useCallback(
    () => exportOperatorJobsToCSV(filteredGridTableData, isAdmin),
    [filteredGridTableData, isAdmin],
  );

  const jobsFetchPage = useCallback(
    async (offset: number, limit: number) => {
      if (hasJobSearch) {
        const items = await fetchAllPaginatedItems<JobEntry>(
          async (pageOffset, pageLimit) => {
            const page = await getOperatorJobsPage(filters, "", createdByFilter, assignedToFilter, "", {
              offset: pageOffset,
              limit: pageLimit,
            });
            return { items: page.items, hasMore: page.hasMore };
          },
          SEARCH_FETCH_PAGE_SIZE,
        );
        return { items, hasMore: false };
      }

      const page = await getOperatorJobsPage(
        filters,
        customerFilter,
        createdByFilter,
        assignedToFilter,
        descriptionFilter,
        { offset, limit },
      );
      return { items: page.items, hasMore: page.hasMore };
    },
    [assignedToFilter, createdByFilter, customerFilter, descriptionFilter, filters, hasJobSearch],
  );

  return {
    handleDownloadCSV,
    jobsFetchPage,
  };
};
