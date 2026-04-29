// ==========================================
// Results Page — Final results per subject
// ==========================================

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function ResultsPage() {
  const { subjectId } = useParams();
  const [subject, setSubject] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [subjectId]);

  const load = async () => {
    try {
      const [subRes, scoreRes] = await Promise.all([
        api.get(`/subjects/${subjectId}`),
        api.get(`/scores/subject/${subjectId}/final`),
      ]);
      setSubject(subRes.data);
      setResults(scoreRes.data);
    } catch (err) {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const handleRecompute = async () => {
    try {
      const { data } = await api.post(`/scores/subject/${subjectId}/recompute`);
      toast.success(data.message);
      load();
    } catch (err) {
      toast.error('Recompute failed');
    }
  };

  const handleExportExcel = () => {
    window.open(`/api/exports/subject/${subjectId}/excel?token=${localStorage.getItem('token')}`, '_blank');
    // Alternative: use api call with blob
    api.get(`/exports/subject/${subjectId}/excel`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${subject?.code}_Results.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('Export failed'));
  };

  const handleExportPDF = () => {
    api.get(`/exports/subject/${subjectId}/report-pdf`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${subject?.code}_Report.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => toast.error('PDF export failed. Generate AI report first.'));
  };

  if (loading) return <div className="text-center py-12"><Spinner /></div>;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Results: {subject?.name}</h1>
          <p className="text-gray-500 mt-1">{subject?.code} • {subject?.class?.name} • {subject?.faculty?.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRecompute} className="btn-secondary">🔄 Recompute</button>
          <button onClick={handleExportExcel} className="btn-secondary">📊 Export Excel</button>
          <button onClick={handleExportPDF} className="btn-secondary">📄 Export PDF Report</button>
        </div>
      </div>

      {/* Summary stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <StatMini label="Students" value={results.length} />
          <StatMini label="Avg Score (out of 15)" value={(results.reduce((s, r) => s + r.finalOutOf15, 0) / results.length).toFixed(2)} />
          <StatMini label="Highest" value={Math.max(...results.map((r) => r.finalOutOf15)).toFixed(2)} />
          <StatMini label="Lowest" value={Math.min(...results.map((r) => r.finalOutOf15)).toFixed(2)} />
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Roll No</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
              {results[0]?.activityBreakdown?.map((ab) => (
                <th key={ab.activity} className="px-4 py-3 text-center font-medium text-gray-500">
                  {ab.activityName} ({ab.totalMarks})
                </th>
              ))}
              <th className="px-4 py-3 text-center font-medium text-gray-500">Raw Total</th>
              <th className="px-4 py-3 text-center font-medium text-gray-500 bg-primary-50">Final /15</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {results.map((r, idx) => (
              <tr key={r._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                <td className="px-4 py-3 font-medium">{r.student?.rollNo}</td>
                <td className="px-4 py-3">{r.student?.name}</td>
                {r.activityBreakdown?.map((ab) => (
                  <td key={ab.activity} className="px-4 py-3 text-center">{ab.score}</td>
                ))}
                <td className="px-4 py-3 text-center">{r.rawTotal}</td>
                <td className="px-4 py-3 text-center font-bold bg-primary-50 text-primary-700">{r.finalOutOf15}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {results.length === 0 && <p className="text-center text-gray-400 py-8">No results yet. Grade activities first.</p>}
      </div>
    </div>
  );
}

function StatMini({ label, value }) {
  return (
    <div className="bg-white rounded-lg border p-4 text-center">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />;
}
