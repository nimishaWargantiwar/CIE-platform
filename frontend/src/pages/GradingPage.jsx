// ==========================================
// Grading Page — AG Grid based fast grading
// ==========================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { HiDownload } from 'react-icons/hi';

export default function GradingPage() {
  const { activityId } = useParams();
  const gridRef = useRef(null);
  const [activity, setActivity] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [rowData, setRowData] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showIncompleteOnly, setShowIncompleteOnly] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const toScore = useCallback((value) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
  }, []);

  const getFilledRubricCount = useCallback((row) => {
    return rubrics.reduce((count, rub) => {
      const score = toScore(row[`rubric_${rub._id}`]);
      return score ? count + 1 : count;
    }, 0);
  }, [rubrics, toScore]);

  const isRowComplete = useCallback((row) => {
    if (rubrics.length === 0) return false;
    return getFilledRubricCount(row) === rubrics.length;
  }, [rubrics.length, getFilledRubricCount]);

  useEffect(() => { loadGrid(); }, [activityId]);

  const loadGrid = async () => {
    try {
      const { data } = await api.get(`/scores/activity/${activityId}`);
      setActivity(data.activity);
      setRubrics(data.rubrics);

      // Transform grid data for AG Grid
      const rows = data.grid.map((row) => {
        const r = {
          studentId: row.student._id,
          rollNo: row.student.rollNo,
          name: row.student.name,
          activityScore: row.activityScore,
        };
        row.rubricScores.forEach((rs) => {
          r[`rubric_${rs.rubricId}`] = rs.score;
        });
        return r;
      });
      setRowData(rows);
      setHasUnsavedChanges(false);
    } catch (err) {
      toast.error('Failed to load grading data');
    }
  };

  const gradingSummary = useMemo(() => {
    const totalStudents = rowData.length;
    const totalCells = totalStudents * rubrics.length;

    let filledCells = 0;
    let fullyGradedStudents = 0;
    let ungradedStudents = 0;

    rowData.forEach((row) => {
      const filled = getFilledRubricCount(row);
      filledCells += filled;

      if (rubrics.length > 0 && filled === rubrics.length) fullyGradedStudents += 1;
      if (filled === 0) ungradedStudents += 1;
    });

    const incompleteStudents = Math.max(totalStudents - fullyGradedStudents, 0);
    const coveragePercent = totalCells > 0 ? Math.round((filledCells / totalCells) * 100) : 0;
    const saveReady = totalStudents > 0 && incompleteStudents === 0;

    return {
      totalStudents,
      fullyGradedStudents,
      incompleteStudents,
      ungradedStudents,
      filledCells,
      totalCells,
      coveragePercent,
      saveReady,
    };
  }, [rowData, rubrics, getFilledRubricCount]);

  const displayedRowData = useMemo(() => {
    if (!showIncompleteOnly) return rowData;
    return rowData.filter((row) => !isRowComplete(row));
  }, [showIncompleteOnly, rowData, isRowComplete]);

  const jumpToFirstIncomplete = useCallback(() => {
    const sourceRows = showIncompleteOnly ? displayedRowData : rowData;
    const targetRow = sourceRows.find((row) => !isRowComplete(row));

    if (!targetRow) {
      toast.success('All students are fully graded.');
      return;
    }

    const rowIndex = sourceRows.findIndex((row) => row.studentId === targetRow.studentId);
    const firstMissingRubric = rubrics.find((rub) => toScore(targetRow[`rubric_${rub._id}`]) === null);
    const focusColumn = firstMissingRubric ? `rubric_${firstMissingRubric._id}` : 'name';

    if (gridRef.current?.api) {
      gridRef.current.api.ensureIndexVisible(rowIndex, 'middle');
      gridRef.current.api.setFocusedCell(rowIndex, focusColumn);
    }
  }, [showIncompleteOnly, displayedRowData, rowData, isRowComplete, rubrics, toScore]);

  // Column definitions
  const columnDefs = useMemo(() => {
    const cols = [
      {
        headerName: 'Roll No',
        field: 'rollNo',
        pinned: 'left',
        width: 110,
        sortable: true,
        filter: true,
      },
      {
        headerName: 'Name',
        field: 'name',
        pinned: 'left',
        width: 180,
        sortable: true,
        filter: true,
      },
      {
        headerName: 'Progress',
        field: 'gradingProgress',
        pinned: 'left',
        width: 130,
        valueGetter: (params) => {
          const filled = getFilledRubricCount(params.data || {});
          if (filled === 0) return 'Not started';
          if (rubrics.length > 0 && filled === rubrics.length) return 'Ready';
          return `${filled}/${rubrics.length}`;
        },
        cellStyle: (params) => {
          if (params.value === 'Ready') return { color: '#166534', fontWeight: 600 };
          if (params.value === 'Not started') return { color: '#92400e', fontWeight: 600 };
          return { color: '#1d4ed8', fontWeight: 600 };
        },
      },
    ];

    rubrics.forEach((rub) => {
      cols.push({
        headerName: rub.name,
        field: `rubric_${rub._id}`,
        width: 120,
        editable: activity?.status !== 'locked',
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: [1, 2, 3, 4, 5] },
        cellStyle: (params) => {
          if (!params.value) return { backgroundColor: '#fef9c3' }; // ungraded
          if (params.value >= 4) return { backgroundColor: '#dcfce7', color: '#166534' };
          if (params.value <= 2) return { backgroundColor: '#fee2e2', color: '#991b1b' };
          return {};
        },
        headerTooltip: `${rub.criteria?.scale1 || ''} → ${rub.criteria?.scale5 || ''}`,
      });
    });

    cols.push({
      headerName: `Score (/${activity?.totalMarks || 0})`,
      field: 'activityScore',
      pinned: 'right',
      width: 130,
      cellStyle: { fontWeight: 'bold', backgroundColor: '#f0f9ff' },
    });

    return cols;
  }, [rubrics, activity, getFilledRubricCount]);

  const defaultColDef = useMemo(() => ({
    resizable: true,
    suppressMovable: true,
  }), []);

  // Collect all edits and save in bulk
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const scores = [];
      rowData.forEach((row) => {
        rubrics.forEach((rub) => {
          const val = toScore(row[`rubric_${rub._id}`]);
          if (val) {
            scores.push({
              studentId: row.studentId,
              rubricId: rub._id,
              score: val,
            });
          }
        });
      });

      if (scores.length === 0) {
        toast.error('Enter at least one score before saving.');
        return;
      }

      await api.post('/scores/bulk', { activityId, scores });
      toast.success(`Saved ${scores.length} scores!`);
      setHasUnsavedChanges(false);
      loadGrid(); // Refresh to recalculate
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  }, [rowData, rubrics, activityId, toScore]);

  const onCellValueChanged = useCallback((event) => {
    setHasUnsavedChanges(true);
    // Update local state for the changed cell
    setRowData((prev) => {
      const updated = [...prev];
      const idx = updated.findIndex((r) => r.studentId === event.data.studentId);
      if (idx >= 0) {
        updated[idx] = { ...event.data };
        // Recalculate activity score
        let sum = 0;
        rubrics.forEach((rub) => {
          const val = toScore(updated[idx][`rubric_${rub._id}`]);
          if (val) sum += val;
        });
        const maxRubric = rubrics.length * 5;
        updated[idx].activityScore = maxRubric > 0
          ? Math.round(((sum / maxRubric) * (activity?.totalMarks || 0)) * 100) / 100
          : 0;
      }
      return updated;
    });
  }, [rubrics, activity, toScore]);

  // Export grading data as CSV (Excel-compatible)
  const handleExportExcel = useCallback(() => {
    if (!rowData.length) {
      toast.error('No data to export');
      return;
    }

    // Build header row
    const headers = ['Roll No', 'Name'];
    rubrics.forEach((rub) => headers.push(rub.name));
    headers.push(`Score (/${activity?.totalMarks || 0})`);

    // Build data rows
    const csvRows = [headers.join(',')];
    rowData.forEach((row) => {
      const cells = [
        `"${row.rollNo}"`,
        `"${row.name}"`,
      ];
      rubrics.forEach((rub) => {
        cells.push(row[`rubric_${rub._id}`] || 0);
      });
      cells.push(row.activityScore || 0);
      csvRows.push(cells.join(','));
    });

    // Download as CSV file
    const csvContent = '\uFEFF' + csvRows.join('\n'); // BOM for Excel UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileName = `${activity?.name || 'grading'}_${activity?.subject?.name || 'scores'}.csv`.replace(/\s+/g, '_');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV successfully!');
  }, [rowData, rubrics, activity]);

  return (
    <div className="space-y-4">
      <div className="panel-card-strong flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80 font-semibold">Scoring Workspace</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Grading: {activity?.name}</h1>
          <p className="text-slate-600 text-sm mt-1">
            {activity?.activityType} • {activity?.subject?.name} • {rubrics.length} rubrics • Score 1-5 per rubric
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Link to={`/activities/${activityId}`} className="btn-secondary">← Back</Link>
          <button onClick={handleExportExcel} className="btn-secondary flex items-center gap-1">
            <HiDownload className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={handleSave} disabled={saving || activity?.status === 'locked'} className="btn-primary">
            {saving ? '💾 Saving...' : '💾 Save All Scores'}
          </button>
        </div>
      </div>

      {activity?.status === 'locked' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
          ⚠️ This activity is locked. Scores are read-only. Request admin to unlock.
        </div>
      )}

      <div className="panel-card">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <SummaryCard title="Fully Graded" value={`${gradingSummary.fullyGradedStudents}/${gradingSummary.totalStudents}`} tone="green" />
          <SummaryCard title="Incomplete Rows" value={`${gradingSummary.incompleteStudents}`} tone="amber" />
          <SummaryCard title="Ungraded Rows" value={`${gradingSummary.ungradedStudents}`} tone="orange" />
          <SummaryCard title="Cell Coverage" value={`${gradingSummary.coveragePercent}%`} tone="blue" />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm">
            <span className="text-slate-600">Save status: </span>
            <span className={`font-medium ${gradingSummary.saveReady ? 'text-green-700' : 'text-amber-700'}`}>
              {gradingSummary.saveReady ? 'Ready to finalize' : 'Work in progress'}
            </span>
            {hasUnsavedChanges && <span className="ml-2 text-blue-700">• Unsaved edits</span>}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowIncompleteOnly((prev) => !prev)}
              className="btn-secondary text-xs"
            >
              {showIncompleteOnly ? 'Show All Rows' : 'Show Incomplete Only'}
            </button>
            <button
              type="button"
              onClick={jumpToFirstIncomplete}
              disabled={gradingSummary.incompleteStudents === 0}
              className="btn-secondary text-xs"
            >
              Jump to First Incomplete
            </button>
          </div>
        </div>
      </div>

      <div className="ag-theme-alpine" style={{ height: 'calc(100vh - 220px)', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={displayedRowData}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          onCellValueChanged={onCellValueChanged}
          animateRows={true}
          enableCellTextSelection={true}
          stopEditingWhenCellsLoseFocus={true}
          singleClickEdit={true}
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, tone = 'blue' }) {
  const toneClass = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    blue: 'bg-sky-50 text-sky-700 border-sky-100',
  }[tone] || 'bg-sky-50 text-sky-700 border-sky-100';

  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide">{title}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}
