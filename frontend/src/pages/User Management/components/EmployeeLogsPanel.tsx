import { useEffect, useMemo, useState } from 'react';
import DataTable, { type Column } from '../../../components/DataTable';
import { getEmployeeLogs } from '../../../services/employeeLogsApi';
import DownloadIcon from '@mui/icons-material/Download';
import type { EmployeeLog } from '../../../types/employeeLog';
import { getDisplayDateTimeParts } from '../../../utils/date';
import MarqueeCopyText from '../../../components/MarqueeCopyText';
import AppLoader from '../../../components/AppLoader';

type RoleTab = 'PROGRAMMER' | 'OPERATOR' | 'QC';

const formatRoleLabel = (role?: string) => {
  const value = String(role || '').toUpperCase();
  if (value === 'PROGRAMMER') return 'Programmer';
  if (value === 'OPERATOR') return 'Operator';
  if (value === 'QC') return 'QC';
  if (value === 'ADMIN') return 'Admin';
  return value || '-';
};

const formatDuration = (seconds?: number) => {
  const safe = Math.max(0, Number(seconds || 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
};

export const EmployeeLogsPanel = () => {
  const [activeRole, setActiveRole] = useState<RoleTab>('PROGRAMMER');
  const [statusFilter, setStatusFilter] = useState<
    '' | 'COMPLETED' | 'IN_PROGRESS' | 'REJECTED'
  >('');
  const [searchQuery, setSearchQuery] = useState('');
  const [logs, setLogs] = useState<EmployeeLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getInitials = (value: string) => {
    const full = String(value || '').trim();
    if (!full) return '--';
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return full.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getEmployeeLogs({
          role: activeRole,
          status: statusFilter || undefined,
          search: searchQuery || undefined,
        });
        setLogs(data);
      } catch (fetchError: any) {
        setError(fetchError?.message || 'Failed to load employee logs');
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, [activeRole, statusFilter, searchQuery]);

  const getWorkedSecondsForLog = (log: EmployeeLog): number => {
    const metadata = (log.metadata || {}) as Record<string, any>;
    const machineHrs = Number(metadata.machineHrs || 0);
    if (Number.isFinite(machineHrs) && machineHrs > 0) {
      return Math.max(0, Math.round(machineHrs * 3600));
    }
    return Math.max(0, Number(log.durationSeconds || 0));
  };

  const groupWorkedSecondsByGroupId = useMemo(() => {
    const map = new Map<string, number>();
    logs.forEach((log) => {
      const groupId = String(log.jobGroupId || '').trim();
      if (!groupId) return;
      if (String(log.role || '').toUpperCase() !== 'OPERATOR') return;
      const workedSeconds = getWorkedSecondsForLog(log);
      map.set(groupId, (map.get(groupId) || 0) + workedSeconds);
    });
    return map;
  }, [logs]);

  const columns = useMemo<Column<EmployeeLog>[]>(() => {
    if (activeRole === 'OPERATOR') {
      return [
        {
          key: 'employee',
          label: 'Employee',
          sortable: false,
          render: (row) => (
            <div className="employee-log-user employee-log-user-badge">
              <span
                className="employee-log-user-initial-badge"
                title={String(row.userName || 'Unknown User').toUpperCase()}
              >
                {getInitials(String(row.userName || 'Unknown User'))}
              </span>
              <span>{formatRoleLabel((row.metadata as any)?.userRole || row.role)}</span>
            </div>
          ),
        },
        {
          key: 'workItemTitle',
          label: 'Work Item',
          sortable: false,
          render: (row) => row.workItemTitle || '-',
        },
        {
          key: 'workSummary',
          label: 'Summary',
          sortable: false,
          render: (row) => {
            const full = String(row.workSummary || '-');
            return <MarqueeCopyText text={full} />;
          },
        },
        {
          key: 'idleTime',
          label: 'Idle Time',
          sortable: false,
          render: (row) => String((row.metadata as any)?.idleTime || '-'),
        },
        {
          key: 'remark',
          label: 'Remark',
          sortable: false,
          render: (row) => String((row.metadata as any)?.remark || '-'),
        },
        {
          key: 'revenue',
          label: 'Revenue',
          sortable: false,
          render: (row) => {
            const metadata = (row.metadata || {}) as Record<string, any>;
            const explicit = metadata.revenue;
            if (
              explicit !== undefined &&
              explicit !== null &&
              String(explicit).trim() !== ''
            )
              return String(explicit);
            const wedm = Number(metadata.wedmAmount || 0);
            if (!wedm) return '-';
            const groupId = String(row.jobGroupId || '').trim();
            const totalWorkedSeconds = groupId ? groupWorkedSecondsByGroupId.get(groupId) || 0 : 0;
            if (!totalWorkedSeconds) return '-';
            const workedSeconds = getWorkedSecondsForLog(row);
            const share = Math.max(0, workedSeconds) / totalWorkedSeconds;
            return `Rs. ${(wedm * share).toFixed(2)}`;
          },
        },
        {
          key: 'startedAt',
          label: 'Started At',
          sortable: false,
          render: (row) => {
            const parts = getDisplayDateTimeParts(row.startedAt);
            return (
              <div className="created-at-split">
                <span>{parts.date}</span>
                <span>{parts.time}</span>
              </div>
            );
          },
        },
        {
          key: 'endedAt',
          label: 'Ended At',
          sortable: false,
          render: (row) => {
            const parts = getDisplayDateTimeParts(row.endedAt || null);
            return (
              <div className="created-at-split">
                <span>{parts.date}</span>
                <span>{parts.time}</span>
              </div>
            );
          },
        },
        {
          key: 'durationSeconds',
          label: 'Time Taken',
          sortable: false,
          render: (row) => formatDuration(row.durationSeconds),
        },
        {
          key: 'status',
          label: 'Status',
          sortable: false,
          className: 'employee-status-cell',
          headerClassName: 'employee-status-col',
          render: (row) => (
            <span
              className={`employee-log-status status-${row.status.toLowerCase()}`}
            >
              {row.status === 'IN_PROGRESS' ? 'In Progress' : row.status === 'REJECTED' ? 'Rejected' : 'Completed'}
            </span>
          ),
        },
      ] as Column<EmployeeLog>[];
    }

    return [
      {
        key: 'employee',
        label: 'Employee',
        sortable: false,
        render: (row) => (
          <div className="employee-log-user employee-log-user-badge">
            <span
              className="employee-log-user-initial-badge"
              title={String(row.userName || 'Unknown User').toUpperCase()}
            >
              {getInitials(String(row.userName || 'Unknown User'))}
            </span>
            <span>{formatRoleLabel((row.metadata as any)?.userRole || row.role)}</span>
          </div>
        ),
      },
      {
        key: 'workItemTitle',
        label: 'Work Item',
        sortable: false,
        className: 'employee-work-item-cell',
        render: (row) => (
          <div className="employee-work-item">
            <span className="ref-badge">Job #{row.refNumber || ""}</span>
          </div>
        ),
      },
      {
        key: 'jobDescription',
        label: 'Description',
        sortable: false,
        render: (row) => {
          const full = String(row.jobDescription || '-');
          return <MarqueeCopyText text={full} />;
        },
      },
      {
        key: 'quantityCount',
        label: 'Quantities',
        sortable: false,
        render: (row) => {
          const computed =
            Number(row.quantityCount || 0) ||
            Number((row.metadata as any)?.quantityCount || 0) ||
            (Number(row.quantityTo || 0) && Number(row.quantityFrom || 0)
              ? Number(row.quantityTo) - Number(row.quantityFrom) + 1
              : 0);
          return computed > 0 ? computed : '-';
        },
      },
      {
        key: 'startedAt',
        label: 'Started At',
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.startedAt);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
      {
        key: 'endedAt',
        label: 'Ended At',
        sortable: false,
        render: (row) => {
          const parts = getDisplayDateTimeParts(row.endedAt || null);
          return (
            <div className="created-at-split">
              <span>{parts.date}</span>
              <span>{parts.time}</span>
            </div>
          );
        },
      },
      {
        key: 'durationSeconds',
        label: 'Time Taken',
        sortable: false,
        render: (row) => formatDuration(row.durationSeconds),
      },
      {
        key: 'status',
        label: 'Status',
        sortable: false,
        className: 'employee-status-cell',
        headerClassName: 'employee-status-col',
        render: (row) => (
          <span
            className={`employee-log-status status-${row.status.toLowerCase()}`}
          >
            {row.status === 'IN_PROGRESS' ? 'In Progress' : row.status === 'REJECTED' ? 'Rejected' : 'Completed'}
          </span>
        ),
      },
    ] as Column<EmployeeLog>[];
  }, [activeRole, groupWorkedSecondsByGroupId]);

  const handleExportCsv = () => {
    const headers = columns.map((col) => String(col.label));
    const rows = logs.map((row, index) =>
      columns.map((col) => {
        try {
          const rendered = col.render
            ? col.render(row, index)
            : (row as any)[col.key];
          if (typeof rendered === 'string' || typeof rendered === 'number')
            return String(rendered);
          if (!rendered) return '';
          return String((row as any)[col.key] ?? '');
        } catch {
          return String((row as any)[col.key] ?? '');
        }
      }),
    );

    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','),
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `job_logs_${activeRole.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="employee-logs-container">
      <div className="employee-role-tabs">
        <button
          type="button"
          className={`employee-role-tab ${activeRole === 'PROGRAMMER' ? 'active' : ''}`}
          onClick={() => {
            setActiveRole('PROGRAMMER');
          }}
        >
          Programmer
        </button>
        <button
          type="button"
          className={`employee-role-tab ${activeRole === 'OPERATOR' ? 'active' : ''}`}
          onClick={() => {
            setActiveRole('OPERATOR');
          }}
        >
          Operator
        </button>
        <button
          type="button"
          className={`employee-role-tab ${activeRole === 'QC' ? 'active' : ''}`}
          onClick={() => {
            setActiveRole('QC');
          }}
        >
          QC
        </button>
      </div>

      <div className="employee-log-filters">
        <input
          type="text"
          className="employee-search-input"
          placeholder="Search employee, job, customer..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
          }}
        />
        <select
          className="employee-status-select"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as '' | 'COMPLETED' | 'IN_PROGRESS' | 'REJECTED');
          }}
        >
          <option value="">All Status</option>
          <option value="COMPLETED">Completed</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <button
          type="button"
          className="employee-csv-btn"
          onClick={handleExportCsv}
          title="Download CSV"
        >
          <DownloadIcon sx={{ fontSize: '1rem' }} />
          CSV
        </button>
      </div>

      {activeRole === 'QC' ? (
        <div className="qa-placeholder-card">
          <h3>QC Logs</h3>
          <p>
            QC logging tab is ready. QC event capture wiring can be added in the
            next step.
          </p>
        </div>
      ) : loading ? (
        <AppLoader message="Loading employee logs..." />
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          emptyMessage="No logs found for the current filters."
          getRowKey={(row) => row._id}
          className="left-align employee-logs-table"
        />
      )}
    </div>
  );
};
