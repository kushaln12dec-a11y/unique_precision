import React from "react";
import "./Pagination.css";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalEntries: number;
  entriesPerPage: number;
  indexOfFirstEntry: number;
  indexOfLastEntry: number;
  onPageChange: (page: number) => void;
  onEntriesPerPageChange: (entries: number) => void;
  entriesPerPageOptions?: number[];
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalEntries,
  entriesPerPage,
  indexOfFirstEntry,
  indexOfLastEntry,
  onPageChange,
  onEntriesPerPageChange,
  entriesPerPageOptions = [5, 10, 15, 25, 50],
}) => {
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onEntriesPerPageChange(Number(e.target.value));
  };

  if (totalEntries === 0) return null;

  return (
    <div className="pagination">
      <div className="pagination-left">
        <span className="show-label">Show</span>
        <select
          className="entries-selector"
          value={entriesPerPage}
          onChange={handleEntriesChange}
        >
          {entriesPerPageOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="pagination-center">
        <button
          className="pagination-arrow"
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
        >
          ‹
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            className={`pagination-page ${
              currentPage === pageNumber ? "active" : ""
            }`}
            onClick={() => onPageChange(pageNumber)}
          >
            {pageNumber}
          </button>
        ))}

        <button
          className="pagination-arrow"
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
        >
          ›
        </button>
      </div>

      <div className="pagination-right">
        Showing {totalEntries === 0 ? 0 : indexOfFirstEntry + 1} - {indexOfLastEntry} of{" "}
        {totalEntries} entries
      </div>
    </div>
  );
};

export default Pagination;
