// ==========================================
// Activity Detail Page — Rubric editor + status
// ==========================================

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import toast from 'react-hot-toast';
import RubricEditor from '../components/RubricEditor';
import ConductionGuidelines from '../components/ConductionGuidelines';
import Modal from '../components/Modal';
import { getYouTubeEmbedUrl } from '../utils/videoEmbed';

export default function ActivityDetailPage() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [rubrics, setRubrics] = useState([]);
  const [learningGuide, setLearningGuide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportImages, setReportImages] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try {
      const { data } = await api.get(`/activities/${id}`);
      setActivity(data.activity);
      setRubrics(data.rubrics);

      try {
        const encodedType = encodeURIComponent(data.activity.activityType);
        const guideRes = await api.get(`/learning/guides/${encodedType}`);
        setLearningGuide(guideRes.data?.guide?.guide || guideRes.data?.guide || null);
      } catch {
        setLearningGuide(null);
      }
    } catch (err) {
      toast.error('Activity not found');
      navigate('/activities');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!confirm('Submit this activity? Rubrics will be locked.')) return;
    try {
      await api.post(`/activities/${id}/submit`);
      toast.success('Activity submitted & rubrics locked!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleUnlock = async () => {
    try {
      await api.post(`/activities/${id}/unlock`);
      toast.success('Activity unlocked!');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this activity and all its rubrics?')) return;
    try {
      await api.delete(`/activities/${id}`);
      toast.success('Deleted!');
      navigate('/activities');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleAIRubrics = async () => {
    if (!activity.topic) return toast.error('Set a topic first');
    try {
      const { data } = await api.post('/ai/generate-rubrics', {
        activityType: activity.activityType,
        topic: activity.topic,
      });
      // Add AI rubrics to activity
      for (const r of data.rubrics) {
        await api.post('/rubrics', {
          activity: id,
          name: r.name,
          criteria: r.criteria,
        });
      }
      toast.success(`Added ${data.rubrics.length} AI-generated rubrics!`);
      load();
    } catch (err) {
      toast.error('AI generation failed');
    }
  };

  const handleOpenReportModal = () => {
    setReportImages([]);
    setShowReportModal(true);
  };

  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      const formData = new FormData();
      reportImages.forEach((file) => formData.append('images', file));

      const response = await api.post(`/exports/activity/${id}/report-pdf`, formData, {
        responseType: 'blob',
      });

      const contentDisposition = response.headers?.['content-disposition'] || '';
      const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const fallbackName = `${(activity.name || 'Activity').replace(/[^a-zA-Z0-9-_]/g, '_')}_Activity_Report.pdf`;
      const filename = match?.[1] || fallbackName;

      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setShowReportModal(false);
      toast.success('Activity report downloaded');
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || 'Failed to generate report';
      toast.error(message);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12"><Spinner /></div>;
  if (!activity) return null;

  const activityVideoEmbedUrl = getYouTubeEmbedUrl(activity.videoUrl || learningGuide?.videoUrl || '');
  const learningCenterLink = `/learning?activityType=${encodeURIComponent(activity.activityType || '')}`;

  const handleOpenMatchingGuide = async () => {
    try {
      await api.post('/learning/guides/view', { activityType: activity.activityType || '' });
    } catch {
      // Non-blocking analytics event.
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="panel-card-strong flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80 font-semibold">Activity Workspace</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{activity.name}</h1>
          <p className="text-slate-600 mt-1">
            {activity.activityType} • {activity.subject?.name} ({activity.subject?.code}) • Class: {activity.subject?.class?.name || 'N/A'} • {activity.totalMarks} marks
          </p>
          {activity.topic && (
            <p className="text-slate-600 mt-1">Topic: {activity.topic}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            activity.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
            activity.status === 'submitted' ? 'bg-green-100 text-green-700' :
            'bg-red-100 text-red-700'
          }`}>
            {activity.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="panel-card flex flex-wrap gap-3">
        <Link to={`/grading/${activity._id}`} className="btn-primary">📝 Open Grading Grid</Link>
        <Link to={learningCenterLink} onClick={handleOpenMatchingGuide} className="btn-secondary">📘 Open Matching Guide</Link>
        <button onClick={handleOpenReportModal} className="btn-secondary">📄 Generate Activity Report</button>
        {activity.activityType === 'Quiz' && (
          <>
            <Link to={`/quiz/builder/${activity._id}`} className="btn-primary bg-indigo-600 hover:bg-indigo-700">
              ❓ Quiz Builder
            </Link>
            <Link to={`/quiz/results/${activity._id}`} className="btn-secondary">
              📊 Quiz Results
            </Link>
          </>
        )}
        {activity.status === 'draft' && (
          <button onClick={handleSubmit} className="btn-secondary bg-green-600 text-white hover:bg-green-700">
            ✅ Submit Activity
          </button>
        )}
        {(activity.status === 'submitted' || activity.status === 'locked') && (isAdmin || true) && (
          <button onClick={handleUnlock} className="btn-secondary bg-orange-500 text-white hover:bg-orange-600">
            🔓 Unlock
          </button>
        )}
        <button onClick={handleAIRubrics} className="btn-secondary">✨ AI Generate Rubrics</button>
        {activity.status === 'draft' && (
          <button onClick={handleDelete} className="btn-secondary text-red-600 border-red-300 hover:bg-red-50">
            🗑️ Delete
          </button>
        )}
      </div>

      {/* Conduction Guidelines */}
      <div>
        <ConductionGuidelines activityType={activity.activityType} collapsible guideData={learningGuide} showVideo={false} />
      </div>

      {activityVideoEmbedUrl && (
        <div className="panel-card">
          <h3 className="font-semibold text-slate-900 mb-3">Reference Video</h3>
          <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
            <iframe
              src={activityVideoEmbedUrl}
              title={`${activity.name} reference video`}
              className="h-full w-full"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Custom Guidelines */}
      {activity.guidelines && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <h3 className="font-semibold text-sky-900 mb-2">📋 Guidelines</h3>
          <pre className="text-sm text-sky-800 whitespace-pre-wrap">{activity.guidelines}</pre>
        </div>
      )}

      {/* Rubric Editor */}
      <div className="panel-card">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Rubrics ({rubrics.length})</h2>
        <RubricEditor
          activityId={id}
          activityType={activity.activityType}
          rubrics={rubrics}
          isLocked={activity.status !== 'draft'}
          onRefresh={load}
        />
      </div>

      <Modal
        show={showReportModal}
        onClose={() => !reportLoading && setShowReportModal(false)}
        title="Generate Activity Report PDF"
        wide
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Add optional conduction images. The report will include activity metadata, guidelines, rubrics, scores, and the selected images.
          </p>

          <div>
            <label className="label">Conduction Images (optional)</label>
            <input
              type="file"
              accept="image/png,image/jpeg"
              multiple
              className="input"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setReportImages(files.slice(0, 8));
              }}
            />
            <p className="text-xs text-slate-500 mt-1">Up to 8 images (JPG/PNG).</p>
          </div>

          {reportImages.length > 0 && (
            <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
              <p className="text-sm font-medium mb-2">Selected Files</p>
              <ul className="text-sm text-slate-700 space-y-1">
                {reportImages.map((file, idx) => (
                  <li key={`${file.name}-${idx}`}>• {file.name}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowReportModal(false)}
              disabled={reportLoading}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleGenerateReport}
              disabled={reportLoading}
              className="btn-primary"
            >
              {reportLoading ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />;
}
