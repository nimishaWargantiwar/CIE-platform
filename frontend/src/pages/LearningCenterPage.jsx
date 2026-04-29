// ==========================================
// Learning Center Page — Admin + Faculty
// ==========================================

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import ConductionGuidelines from '../components/ConductionGuidelines';

export default function LearningCenterPage() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const preferredType = `${searchParams.get('activityType') || ''}`.trim();
  const trackedGuideTypes = useRef(new Set());
  const [loading, setLoading] = useState(true);
  const [guides, setGuides] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [showUnpublished, setShowUnpublished] = useState(false);

  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.activityType === selectedType) || null,
    [guides, selectedType]
  );

  useEffect(() => {
    loadGuides();
  }, [showUnpublished, preferredType]);

  useEffect(() => {
    if (isAdmin || !selectedType) return;

    const key = selectedType.toLowerCase();
    if (trackedGuideTypes.current.has(key)) return;
    trackedGuideTypes.current.add(key);

    api.post('/learning/guides/view', { activityType: selectedType }).catch(() => {
      trackedGuideTypes.current.delete(key);
    });
  }, [selectedType, isAdmin]);

  const loadGuides = async () => {
    setLoading(true);
    try {
      const query = isAdmin && showUnpublished ? '?includeUnpublished=true' : '';
      const { data } = await api.get(`/learning/guides${query}`);
      const list = data?.guides || [];
      setGuides(list);
      if (list.length > 0) {
        const preferredGuide = preferredType
          ? list.find((guide) => guide.activityType.toLowerCase() === preferredType.toLowerCase())
          : null;
        const fallbackType = preferredGuide?.activityType || list[0].activityType;

        const alreadySelected = list.some((guide) => guide.activityType === selectedType);
        if (!alreadySelected || preferredGuide) setSelectedType(fallbackType);
      } else {
        setSelectedType('');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load learning guides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="panel-card-strong flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-700/80 font-semibold">Playbook Hub</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">Learning Center</h1>
          <p className="text-slate-600 mt-1">
            Activity-wise conduction playbooks for new and existing faculty.
          </p>
        </div>

        {isAdmin && (
          <label className="inline-flex items-center gap-2 text-sm text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2">
            <input
              type="checkbox"
              checked={showUnpublished}
              onChange={(e) => setShowUnpublished(e.target.checked)}
            />
            Show unpublished guides
          </label>
        )}
      </div>

      {loading ? (
        <div className="panel-card text-center text-slate-500">Loading guides...</div>
      ) : guides.length === 0 ? (
        <div className="panel-card text-center">
          <p className="text-slate-500">No learning guides found yet.</p>
          <p className="text-sm text-slate-400 mt-2">
            Admin can create and publish activity guidance from the Templates page.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <aside className="lg:col-span-4 panel-card">
            <h2 className="font-semibold text-slate-900 mb-3">Activity Guides ({guides.length})</h2>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
              {guides.map((guide) => {
                const active = guide.activityType === selectedType;
                return (
                  <button
                    key={guide.templateId}
                    onClick={() => setSelectedType(guide.activityType)}
                    className={`w-full text-left rounded-lg border px-3 py-2 transition ${
                      active
                        ? 'border-sky-500 bg-sky-50'
                        : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-slate-900">{guide.activityType}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                        {guide.usageCount} used
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{guide.description || 'No description'}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span>Priority: {guide.guidePriority}</span>
                      <span>•</span>
                      <span className={guide.isGuidePublished ? 'text-green-600' : 'text-amber-600'}>
                        {guide.isGuidePublished ? 'Published' : 'Draft'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="lg:col-span-8 space-y-4">
            {selectedGuide && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MetaCard title="Usage Count" value={`${selectedGuide.usageCount}`} subtitle="Existing activities" />
                <MetaCard
                  title="Guide Status"
                  value={selectedGuide.isGuidePublished ? 'Published' : 'Draft'}
                  subtitle="Admin controls visibility"
                />
                <MetaCard title="Priority" value={`${selectedGuide.guidePriority}`} subtitle="Lower number appears first" />
              </div>
            )}

            {selectedGuide && (
              <ConductionGuidelines
                activityType={selectedGuide.activityType}
                guideData={selectedGuide.guide}
              />
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function MetaCard({ title, value, subtitle }) {
  return (
    <div className="panel-card">
      <p className="text-xs text-slate-500 uppercase tracking-wide">{title}</p>
      <p className="text-lg font-semibold text-slate-900 mt-1">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}
