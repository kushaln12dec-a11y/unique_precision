import { useMemo } from "react";
import CreatedByBadge from "../../../components/CreatedByBadge";
import type { JobEntry } from "../../../types/job";
import ActionButtons from "../../Programmer/components/ActionButtons";
import ArrowForwardIosSharpIcon from "@mui/icons-material/ArrowForwardIosSharp";
import { getDispatchableQuantityNumbers, getGroupQaProgressCounts, getQaProgressCounts } from "../utils/qaProgress";
import type { Column } from "../../../components/DataTable";
import {
  estimatedHoursFromAmount,
  formatEstimatedTime,
  formatJobRefDisplay,
  formatMachineLabel,
  MACHINE_OPTIONS,
  toMachineIndex,
  toYN,
} from "../../../utils/jobFormatting";
import MarqueeCopyText from "../../../components/MarqueeCopyText";
import SelectDropdown from "../../Programmer/components/SelectDropdown";
import { MultiSelectOperators } from "../components/MultiSelectOperators";
import { getThicknessDisplayValue } from "../../Programmer/programmerUtils";

type TableRow = {
  groupId: string;
  parent: JobEntry;
  groupTotalHrs: number;
  groupTotalAmount: number;
  entries: JobEntry[];
};

export type OperatorDisplayRow = {
  kind: "parent" | "child";
  groupId: string;
  tableRow: TableRow;
  entry: JobEntry;
  childIndex: number | null;
  hasChildren: boolean;
  isExpanded: boolean;
};

type UseOperatorTableProps = {
  canAssign: boolean;
  operatorUsers: Array<{ id: string | number; name: string }>;
  machineOptions: string[];
  currentUserName: string;
  handleAssignChange: (jobId: number | string, value: string) => void;
  handleMachineNumberChange: (groupId: string, machineNumber: string) => void;
  handleChildMachineNumberChange: (jobId: number | string, machineNumber: string) => void;
  handleViewJob: (row: TableRow) => void;
  handleViewEntry: (entry: JobEntry) => void;
  handleSubmit: (groupId: string) => void;
  handleImageInput: (groupId: string, cutId?: string | number) => void;
  handleOpenQaModal: (entries: JobEntry[]) => void;
  isAdmin: boolean;
  isImageInputDisabled: boolean;
  toggleGroup: (groupId: string) => void;
};

export const useOperatorTable = ({
  canAssign,
  operatorUsers,
  machineOptions,
  currentUserName,
  handleAssignChange,
  handleMachineNumberChange,
  handleChildMachineNumberChange,
  handleViewJob,
  handleViewEntry,
  handleSubmit,
  handleImageInput,
  handleOpenQaModal,
  isAdmin,
  isImageInputDisabled,
  toggleGroup,
}: UseOperatorTableProps): Column<OperatorDisplayRow>[] => {
  const machineDropdownOptions = useMemo(() => {
    const normalized = machineOptions
      .map((value) => toMachineIndex(value))
      .filter(Boolean);
    return normalized.length > 0 ? normalized : [...MACHINE_OPTIONS];
  }, [machineOptions]);

  const getMachineNumber = (job: JobEntry): string => {
    const direct = String((job as any).machineNumber || "").trim();
    if (direct) return toMachineIndex(direct);
    const captures = Array.isArray(job.operatorCaptures) ? job.operatorCaptures : [];
    const latest = captures[captures.length - 1];
    const captureMachine = String(latest?.machineNumber || "").trim();
    return toMachineIndex(captureMachine);
  };

  const operatorNameLookup = useMemo(() => {
    const lookup = new Map<string, string>();
    operatorUsers.forEach((user) => {
      const fullName = String(user.name || "").trim();
      if (!fullName) return;
      lookup.set(fullName.toLowerCase(), fullName);
      const firstToken = fullName.split(/\s+/).filter(Boolean)[0];
      if (firstToken) {
        lookup.set(firstToken.toLowerCase(), fullName);
      }
    });
    return lookup;
  }, [operatorUsers]);

  const normalizeAssignedOperators = (value: unknown): string[] => {
    const source = Array.isArray(value)
      ? value
      : String(value || "")
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean);

    const unique = new Set<string>();
    const normalized: string[] = [];
    source.forEach((name) => {
      const normalizedName = String(name || "").trim().toLowerCase();
      if (!normalizedName || normalizedName === "unassigned" || normalizedName === "unassign") return;
      const mappedName = operatorNameLookup.get(name.toLowerCase()) || name;
      const key = mappedName.toLowerCase();
      if (unique.has(key)) return;
      unique.add(key);
      normalized.push(mappedName);
    });
    return normalized;
  };

  const getGroupExpectedHours = (entries: JobEntry[]): number => {
    const wedmAmount = entries.reduce(
      (sum, entry) => sum + (Number(entry.totalHrs || 0) * Number(entry.rate || 0)),
      0
    );
    return estimatedHoursFromAmount(wedmAmount);
  };

  const getLatestActiveCaptureStartedAt = (entries: JobEntry[]): string | null => {
    let latestStart: string | null = null;
    entries.forEach((entry) => {
      const captures = Array.isArray(entry.operatorCaptures) ? entry.operatorCaptures : [];
      captures.forEach((capture) => {
        if (!capture?.startTime || capture?.endTime) return;
        const startedAt = new Date(capture.startTime);
        if (Number.isNaN(startedAt.getTime())) return;
        if (!latestStart || startedAt.getTime() > new Date(latestStart).getTime()) {
          latestStart = capture.startTime;
        }
      });
    });
    return latestStart;
  };

  const formatDurationMinutes = (minutes: number): string => {
    const safeMinutes = Math.max(1, Math.ceil(minutes));
    return safeMinutes === 1 ? "1 min" : `${safeMinutes} mins`;
  };

  return useMemo<Column<OperatorDisplayRow>[]>(
    () => [
      {
        key: "customer",
        label: "Customer",
        sortable: false,
        sortKey: "customer",
        className: "customer-cell",
        headerClassName: "customer-header",
        render: (row: OperatorDisplayRow) => {
          const isChild = row.kind === "child";

          return (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: "0.2rem", width: "100%" }}>
              {!isChild && row.hasChildren && (
                <button
                  type="button"
                  className="accordion-toggle-button operator-accordion-toggle"
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleGroup(row.groupId);
                  }}
                  aria-label={row.isExpanded ? "Collapse settings" : "Expand settings"}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#1a1a2e",
                    minWidth: "1rem",
                    width: "1rem",
                    transition: "transform 0.2s ease",
                    transform: row.isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                  }}
                >
                  <ArrowForwardIosSharpIcon sx={{ fontSize: "0.7rem" }} />
                </button>
              )}
              {isChild && <span className="inline-row-branch">|-</span>}
              {!isChild && !row.hasChildren && <span style={{ width: "1rem" }} />}
              <span>{row.entry.customer || "-"}</span>
            </div>
          );
        },
      },
      {
        key: "programRef",
        label: "Job ref",
        sortable: false,
        render: (row) => {
          const ref = row.entry.refNumber || "";
          return formatJobRefDisplay(ref);
        },
      },
      {
        key: "programRefFileName",
        label: (
          <>
            Program Ref
            <br />
            File Name
          </>
        ),
        sortable: false,
        render: (row) => {
          const value = String((row.entry as any).programRefFile || (row.entry as any).programRefFileName || "-");
          return <MarqueeCopyText text={value} />;
        },
      },
      {
        key: "description",
        label: "Description",
        sortable: false,
        sortKey: "description",
        render: (row) => {
          const full = row.entry.description || "-";
          return <MarqueeCopyText text={full} />;
        },
      },
      {
        key: "cut",
        label: "Cut (mm)",
        sortable: false,
        sortKey: "cut",
        render: (row) => Math.round(Number(row.entry.cut || 0)),
      },
      {
        key: "thickness",
        label: "TH (MM)",
        sortable: false,
        sortKey: "thickness",
        render: (row) => getThicknessDisplayValue(row.entry.thickness),
      },
      {
        key: "passLevel",
        label: "Pass",
        sortable: false,
        sortKey: "passLevel",
        render: (row) => row.entry.passLevel,
      },
      {
        key: "setting",
        label: "Setting",
        sortable: false,
        sortKey: "setting",
        render: (row) => row.entry.setting,
      },
      {
        key: "qty",
        label: "Qty",
        sortable: false,
        sortKey: "qty",
        render: (row) => Number(row.entry.qty || 0).toString(),
      },
      {
        key: "sedm",
        label: "SEDM",
        sortable: false,
        render: (row) => {
          const sedm = toYN(row.entry.sedm);
          const sedmClass = sedm === "Y" ? "sedm-badge yes" : sedm === "N" ? "sedm-badge no" : "sedm-badge";
          return <span className={sedmClass}>{sedm}</span>;
        },
      },
      {
        key: "assignedTo",
        label: "Operator",
        sortable: false,
        className: "operator-assigned-cell",
        render: (row) => {
          const assignedToValue = row.entry.assignedTo || "";
          const assignedOperators = normalizeAssignedOperators(assignedToValue);

          return canAssign ? (
            <MultiSelectOperators
              selectedOperators={assignedOperators}
              availableOperators={operatorUsers}
              className="operator-assigned-dropdown"
              onChange={(operators) => {
                const uniqueOperators = [...new Set(operators.map((name) => name.trim()).filter(Boolean))];
                const value = uniqueOperators.length > 0 ? uniqueOperators.join(", ") : "Unassign";
                handleAssignChange(row.entry.id, value);
              }}
              assignToSelfName={currentUserName || undefined}
              placeholder="Unassign"
              compact
            />
          ) : (
            <div className="assigned-operators-readonly">
              {assignedOperators.length > 0 ? (
                assignedOperators.length > 1 ? (
                  <span className="compact-display-readonly" title={assignedOperators.join(", ")}>
                    {assignedOperators[0]}+{assignedOperators.length - 1}
                  </span>
                ) : (
                  <span className="operator-badge-readonly">{assignedOperators[0]}</span>
                )
              ) : (
                <span className="unassigned-text">Unassign</span>
              )}
            </div>
          );
        },
      },
      {
        key: "machineNumber",
        label: "Mach #",
        sortable: false,
        className: "operator-machine-cell",
        render: (row) => (
          <SelectDropdown
            className="operator-machine-dropdown-wrapper"
            value={machineDropdownOptions.includes(getMachineNumber(row.entry)) ? getMachineNumber(row.entry) : ""}
            onChange={(nextValue) => {
              if (row.kind === "parent") {
                handleMachineNumberChange(row.groupId, nextValue);
              } else {
                handleChildMachineNumberChange(row.entry.id, nextValue);
              }
            }}
            options={[
              ...machineDropdownOptions.map((machine) => ({
                label: formatMachineLabel(machine),
                value: machine,
              })),
            ]}
            placeholder="Select"
            align="left"
          />
        ),
      },

      {
        key: "estimatedTime",
        label: (
          <>
            Estimated
            <br />
            Time
          </>
        ),
        sortable: false,
        render: (row) => {
          const sourceEntries = row.kind === "parent" ? row.tableRow.entries : [row.entry];
          const expectedHours = getGroupExpectedHours(sourceEntries);
          const activeStartedAt = getLatestActiveCaptureStartedAt(sourceEntries);
          if (activeStartedAt && expectedHours > 0) {
            const elapsedHours = Math.max(0, Date.now() - new Date(activeStartedAt).getTime()) / 3600000;
            if (elapsedHours > expectedHours) {
              return (
                <span
                  className="operator-overtime-value"
                  title={`Expected ${formatEstimatedTime(expectedHours)}`}
                >
                  Overtime {formatDurationMinutes((elapsedHours - expectedHours) * 60)}
                </span>
              );
            }
          }
          return formatEstimatedTime(expectedHours);
        },
      },
        ...(isAdmin
          ? [
          {
            key: "totalAmount",
            label: "Amount (Rs.)",
            sortable: false,
            sortKey: "totalAmount",
            className: "operator-amount-cell",
            headerClassName: "operator-amount-header",
            render: (row: OperatorDisplayRow) =>
              row.kind === "parent"
                ? row.tableRow.groupTotalAmount
                  ? `Rs. ${Math.round(row.tableRow.groupTotalAmount)}`
                  : "-"
                : row.entry.totalAmount
                  ? `Rs. ${Math.round(row.entry.totalAmount)}`
                  : "-",
          } as Column<OperatorDisplayRow>,
        ]
        : []),
      {
        key: "productionStage",
        label: "Status",
        sortable: false,
        className: "status-cell",
        headerClassName: "status-header",
        render: (row) => {
          const c = row.kind === "parent"
            ? getGroupQaProgressCounts(row.tableRow.entries)
            : getQaProgressCounts(row.entry, Math.max(1, Number(row.entry.qty || 1)));
          const badges = [
            { className: "empty", label: `Yet to Start ${c.empty}` },
            { className: "ready", label: `In Progress ${c.ready}` },
            { className: "saved", label: `Logged ${c.saved}` },
            { className: "sent", label: `QC ${c.sent}` },
          ];
          return (
            <div className="child-stage-summary">
              <div
                className="qa-badge-ticker"
                title={badges.map((badge) => badge.label).join(" | ")}
              >
                <div className="qa-badge-track">
                  {[...badges, ...badges].map((badge, index) => (
                    <span key={`${badge.className}-${index}`} className={`qa-mini ${badge.className}`}>
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        key: "createdBy",
        label: "Created By",
        sortable: false,
        sortKey: "createdBy",
        className: "created-by-cell",
        headerClassName: "created-by-header",
        render: (row) => <CreatedByBadge value={row.entry.createdBy} />,
      },
      {
        key: "action",
        label: "Action",
        sortable: false,
        className: "action-cell",
        headerClassName: "action-header",
        render: (row) => {
          const isChild = row.kind === "child";
          const targetEntries = isChild ? [row.entry] : row.tableRow.entries;
          const canSendToQa = targetEntries.some((entry) => getDispatchableQuantityNumbers(entry).length > 0);
          return (
            <ActionButtons
              onView={() => (isChild ? handleViewEntry(row.entry) : handleViewJob(row.tableRow))}
              onImage={isChild ? () => handleImageInput(row.groupId, row.entry.id) : !row.hasChildren ? () => handleSubmit(row.groupId) : undefined}
              onSubmit={() => handleOpenQaModal(targetEntries)}
              viewLabel={`View ${row.entry.customer || "entry"}`}
              imageLabel={`Open ${row.entry.customer || "entry"}`}
              submitLabel="Send to QC"
              isOperator={true}
              disableImageButton={isImageInputDisabled}
              disableSubmitButton={!canSendToQa}
            />
          );
        },
      },
    ],
    [
      canAssign,
      operatorUsers,
      machineDropdownOptions,
      currentUserName,
      handleAssignChange,
      handleMachineNumberChange,
      handleChildMachineNumberChange,
      handleViewJob,
      handleViewEntry,
      handleSubmit,
      handleImageInput,
      handleOpenQaModal,
      isAdmin,
      isImageInputDisabled,
      operatorNameLookup,
      toggleGroup,
    ]
  );
};
