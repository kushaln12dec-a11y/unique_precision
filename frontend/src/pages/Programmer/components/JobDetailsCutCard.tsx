import React from "react";
import ImageUpload from "./ImageUpload";
import type { JobEntry } from "../../../types/job";
import type { DetailPair } from "../utils/jobDetailsUtils";
import { toRows } from "../utils/jobDetailsUtils";

type JobDetailsCutCardProps = {
  cutItem: JobEntry;
  index: number;
  isSingleCut: boolean;
  isExpanded: boolean;
  pairs: DetailPair[];
  onToggle: () => void;
};

const JobDetailsCutCard = ({
  cutItem,
  index,
  isSingleCut,
  isExpanded,
  pairs,
  onToggle,
}: JobDetailsCutCardProps) => {
  const cutImages = Array.isArray(cutItem.cutImage) ? cutItem.cutImage : cutItem.cutImage ? [cutItem.cutImage] : [];

  return (
    <div className={`cut-item ${isExpanded ? "expanded" : "collapsed"}`}>
      <button type="button" className="cut-item-header cut-accordion-trigger" onClick={onToggle} aria-expanded={isExpanded}>
        <h4>Cut {index + 1}</h4>
        {!isSingleCut && <span className={`cut-accordion-icon ${isExpanded ? "open" : ""}`}>▾</span>}
      </button>

      <div className={`cut-item-content-wrapper ${cutImages.length === 0 ? "no-image" : ""} ${isExpanded ? "open" : "closed"}`}>
        {isExpanded && (
          <>
            <table className="job-details-table cut-details-table compact-table">
              <tbody>
                {toRows(pairs, 2).map((row, rowIndex) => (
                  <tr key={`cut-${index}-row-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <React.Fragment key={`${cell.label}-${cellIndex}`}>
                        <td className="job-details-label">{cell.label}:</td>
                        <td className="job-details-value">{cell.value}</td>
                      </React.Fragment>
                    ))}
                    {row.length === 1 && (
                      <>
                        <td className="job-details-label">-</td>
                        <td className="job-details-value">-</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {cutImages.length > 0 && (
              <div className="cut-image-side">
                <label>Image</label>
                <ImageUpload images={cutImages} label={`Cut ${index + 1}`} onImageChange={() => {}} onRemove={() => {}} readOnly />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default JobDetailsCutCard;
