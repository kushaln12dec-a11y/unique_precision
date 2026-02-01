import React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { PencilIcon, DustbinIcon } from "../../../utils/icons";
import { getUserRoleFromToken } from "../../../utils/auth";

type ActionButtonsProps = {
  onView: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImage?: () => void;
  onSubmit?: () => void;
  viewLabel?: string;
  editLabel?: string;
  deleteLabel?: string;
  imageLabel?: string;
  submitLabel?: string;
  isChildTable?: boolean;
  isOperator?: boolean;
};

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onView,
  onEdit,
  onDelete,
  onImage,
  onSubmit,
  viewLabel,
  editLabel,
  deleteLabel,
  imageLabel,
  submitLabel,
  isChildTable = false,
  isOperator = false,
}) => {
  const isAdmin = getUserRoleFromToken() === "ADMIN";
  const isProgrammer = getUserRoleFromToken() === "PROGRAMMER";

  return (
    <div className="action-buttons" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="action-icon-button"
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        aria-label={viewLabel || "View details"}
        title={viewLabel || "View Details"}
      >
        <VisibilityIcon fontSize="small" />
      </button>
      {!isOperator && (isAdmin || isProgrammer) && onEdit && (
        <button
          type="button"
          className="action-icon-button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          aria-label={editLabel || "Edit"}
          title={editLabel || "Edit"}
        >
          <PencilIcon fontSize="small" />
        </button>
      )}
      {isOperator && onImage && (
        <button
          type="button"
          className="action-icon-button"
          onClick={(e) => {
            e.stopPropagation();
            onImage();
          }}
          aria-label={imageLabel || "Image"}
          title={imageLabel || "Image Input"}
        >
          <ArrowOutwardIcon fontSize="small" />
        </button>
      )}
      {isOperator && onSubmit && (
        <button
          type="button"
          className="action-icon-button submit-icon"
          onClick={(e) => {
            e.stopPropagation();
            onSubmit();
          }}
          aria-label={submitLabel || "Submit"}
          title={submitLabel || "Submit"}
        >
          <CheckCircleIcon fontSize="small" />
        </button>
      )}
      {isAdmin && onDelete && (
        <button
          type="button"
          className={`action-icon-button danger ${isChildTable ? "child-table-delete" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={deleteLabel || "Delete"}
          title={deleteLabel || "Delete"}
        >
          <DustbinIcon fontSize="small" />
        </button>
      )}
    </div>
  );
};

export default ActionButtons;
