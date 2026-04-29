// ==========================================
// AI Tools Page — Class Insights only
// ==========================================

import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AIToolsPage() {
  const [subjects, setSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [insightsResult, setInsightsResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const getAiErrorMessage = (err) => {
    const status = err?.response?.status;
    const apiMessage = err?.response?.data?.message;
    const raw = `${apiMessage || err?.message || ''}`.toLowerCase();

    if (status === 429 || raw.includes('quota') || raw.includes('resource_exhausted') || raw.includes('429')) {
      return 'Gemini quota exceeded or unavailable for this key. Check AI Studio quota/billing or use another API key.';
    }

    return apiMessage || 'Generation failed';
  };

  useEffect(() => {
    api.get('/subjects').then((r) => {
      const list = r.data || [];
      setSubjects(list);
      if (list.length && !selectedSubject) {
        setSelectedSubject(list[0]._id);
      }
    });
  }, []);

  useEffect(() => {
    const endpoint = selectedSubject
      ? `/activities?subject=${selectedSubject}`
      : '/activities';

    api.get(endpoint).then((r) => {
      const list = r.data || [];
      setActivities(list);

      if (list.length === 0) {
        setSelectedActivity('');
        return;
      }

      const selectedStillExists = list.some((a) => a._id === selectedActivity);
      if (!selectedStillExists) {
        setSelectedActivity(list[0]._id);
      }
    });
  }, [selectedSubject]);

  const handleClassInsights = async () => {
    if (!selectedActivity) return toast.error('Select an activity');

    setLoading(true);
    try {
      const { data } = await api.post('/ai/class-insights', { activityId: selectedActivity });
      setInsightsResult(data);
      toast.success('Insights generated');
    } catch (err) {
      toast.error(getAiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="panel-card-strong">
        <h1 className="text-2xl font-bold text-slate-900">AI Tools</h1>
        <p className="text-sm text-slate-600 mt-1">Class Insights</p>
      </div>

      <div className="panel-card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Class Insights</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Subject</label>
            <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="input">
              <option value="">All Subjects</option>
              {subjects.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Activity</label>
            <select value={selectedActivity} onChange={(e) => setSelectedActivity(e.target.value)} className="input">
              <option value="">Select Activity</option>
              {activities.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        {activities.length === 0 && (
          <p className="text-sm text-slate-500 mb-4">No activities found for the selected subject.</p>
        )}

        <button onClick={handleClassInsights} disabled={loading} className="btn-primary">
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>

        {insightsResult && (
          <div className="mt-6 space-y-4">
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
              <h3 className="font-medium text-sky-900 mb-2">Summary</h3>
              <p className="text-sm text-sky-800">{insightsResult.insights}</p>
            </div>

            {insightsResult.weakAreas?.length > 0 && (
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Weak Areas</h3>
                {insightsResult.weakAreas.map((w, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-red-200 bg-red-50 p-3 mb-2">
                    <div className="text-center">
                      <span className="text-xl font-bold text-red-600">{w.avgScore}</span>
                      <p className="text-xs text-red-500">/5</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{w.rubricName}</p>
                      <p className="text-sm text-slate-600">{w.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {insightsResult.strongAreas?.length > 0 && (
              <div>
                <h3 className="font-medium text-slate-900 mb-2">Strong Areas</h3>
                {insightsResult.strongAreas.map((s, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 mb-2">
                    <div className="text-center">
                      <span className="text-xl font-bold text-emerald-600">{s.avgScore}</span>
                      <p className="text-xs text-emerald-500">/5</p>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{s.rubricName}</p>
                      <p className="text-sm text-slate-600">{s.suggestion}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
