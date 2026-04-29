// ==========================================
// Rubric Editor Component
// ==========================================

import { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

const BASE_CRITERIA = {
  scale1: '',
  scale2: '',
  scale3: '',
  scale4: '',
  scale5: '',
};

const RUBRIC_PRESETS = {
  PPT: [
    {
      name: 'Content Depth',
      criteria: {
        scale1: 'Content is mostly inaccurate or too shallow.',
        scale2: 'Some relevant points, but gaps in understanding.',
        scale3: 'Covers core concepts with acceptable clarity.',
        scale4: 'Well-researched with good conceptual depth.',
        scale5: 'Exceptional depth, synthesis, and real-world linkage.',
      },
    },
    {
      name: 'Presentation Delivery',
      criteria: {
        scale1: 'Reading from slides, unclear speech, poor flow.',
        scale2: 'Partially clear delivery with frequent hesitation.',
        scale3: 'Clear delivery with moderate confidence.',
        scale4: 'Confident, structured, and engaging delivery.',
        scale5: 'Highly engaging, polished, and audience-aware delivery.',
      },
    },
  ],
  GD: [
    {
      name: 'Communication Clarity',
      criteria: {
        scale1: 'Ideas unclear and hard to follow.',
        scale2: 'Some clear points but inconsistent structure.',
        scale3: 'Generally clear communication and acceptable flow.',
        scale4: 'Clear, coherent, and well-structured communication.',
        scale5: 'Highly articulate, concise, and persuasive communication.',
      },
    },
    {
      name: 'Collaboration and Listening',
      criteria: {
        scale1: 'Interrupts others or does not participate constructively.',
        scale2: 'Limited listening; occasional constructive participation.',
        scale3: 'Listens and contributes with reasonable balance.',
        scale4: 'Actively listens, builds on peers, and supports discussion.',
        scale5: 'Excellent collaborative behavior and inclusive leadership.',
      },
    },
  ],
  Lab: [
    {
      name: 'Implementation Correctness',
      criteria: {
        scale1: 'Solution is incomplete or mostly incorrect.',
        scale2: 'Partially working with major functional errors.',
        scale3: 'Core functionality works with minor issues.',
        scale4: 'Correct and stable implementation.',
        scale5: 'Fully correct, robust, and thoroughly validated.',
      },
    },
    {
      name: 'Problem Solving Approach',
      criteria: {
        scale1: 'No clear approach or random trial-and-error.',
        scale2: 'Basic approach but weak reasoning.',
        scale3: 'Reasonable approach with moderate justification.',
        scale4: 'Good approach with clear and logical reasoning.',
        scale5: 'Excellent strategy with optimization and strong justification.',
      },
    },
  ],
  Other: [
    {
      name: 'Conceptual Understanding',
      criteria: {
        scale1: 'Poor understanding of the core concepts.',
        scale2: 'Limited understanding with frequent errors.',
        scale3: 'Moderate understanding of key concepts.',
        scale4: 'Strong understanding with minor gaps.',
        scale5: 'Excellent and applied understanding of concepts.',
      },
    },
    {
      name: 'Execution Quality',
      criteria: {
        scale1: 'Task execution is weak and incomplete.',
        scale2: 'Execution is partial with major quality issues.',
        scale3: 'Acceptable execution with room for improvement.',
        scale4: 'High-quality execution meeting expectations.',
        scale5: 'Outstanding execution beyond expectations.',
      },
    },
  ],
};

function isCriteriaFilled(criteria = {}) {
  return [1, 2, 3, 4, 5].filter((s) => `${criteria[`scale${s}`] || ''}`.trim().length > 0).length;
}

export default function RubricEditor({ activityId, activityType = 'General', rubrics, isLocked, onRefresh }) {
  const [editing, setEditing] = useState(null); // rubric id being edited
  const [form, setForm] = useState({ name: '', criteria: {} });
  const [showAdd, setShowAdd] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [libraryRubrics, setLibraryRubrics] = useState([]);
  const [newRubric, setNewRubric] = useState({
    name: '',
    criteria: { ...BASE_CRITERIA },
  });

  const starterPresets = useMemo(() => {
    const exact = RUBRIC_PRESETS[activityType] || [];
    const fallback = RUBRIC_PRESETS.Other || [];
    return exact.length ? exact : fallback;
  }, [activityType]);

  useEffect(() => {
    loadLibraryRubrics();
  }, [activityType]);

  const loadLibraryRubrics = async () => {
    setLoadingLibrary(true);
    try {
      const requests = [api.get(`/rubrics/library?activityType=${encodeURIComponent(activityType)}`)];
      if (activityType.toLowerCase() !== 'general') {
        requests.push(api.get('/rubrics/library?activityType=General'));
      }

      const results = await Promise.all(requests);
      const merged = results.flatMap((res) => res.data || []);
      const deduped = [];
      const seen = new Set();
      merged.forEach((rubric) => {
        const key = `${rubric.name}|${JSON.stringify(rubric.criteria || {})}`.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        deduped.push(rubric);
      });

      setLibraryRubrics(deduped.slice(0, 6));
    } catch {
      setLibraryRubrics([]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const startEdit = (rubric) => {
    setEditing(rubric._id);
    setForm({ name: rubric.name, criteria: { ...rubric.criteria } });
  };

  const handleSaveEdit = async (id) => {
    try {
      await api.put(`/rubrics/${id}`, form);
      toast.success('Rubric updated!');
      setEditing(null);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this rubric?')) return;
    try {
      await api.delete(`/rubrics/${id}`);
      toast.success('Rubric deleted!');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleAdd = async () => {
    if (!newRubric.name.trim()) {
      toast.error('Rubric name is required');
      return;
    }

    try {
      await api.post('/rubrics', { activity: activityId, ...newRubric });
      toast.success('Rubric added!');
      setShowAdd(false);
      setNewRubric({ name: '', criteria: { ...BASE_CRITERIA } });
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleQuickAddPreset = async (preset) => {
    try {
      await api.post('/rubrics', {
        activity: activityId,
        name: preset.name,
        criteria: preset.criteria,
      });
      toast.success(`Added preset: ${preset.name}`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error adding preset');
    }
  };

  const handleApplyLibraryRubric = async (libraryRubric) => {
    try {
      await api.post(`/rubrics/library/${libraryRubric._id}/apply`, { activityId });
      toast.success(`Applied from library: ${libraryRubric.name}`);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error applying library rubric');
    }
  };

  const handleSaveToLibrary = async (rubric) => {
    try {
      await api.post('/rubrics/library', {
        activityType: activityType || 'General',
        name: rubric.name,
        criteria: rubric.criteria,
      });
      toast.success('Saved to library!');
      loadLibraryRubrics();
    } catch (err) {
      toast.error('Error saving to library');
    }
  };

  return (
    <div className="space-y-4">
      {!isLocked && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Rubric Onboarding Assistant</h3>
              <p className="text-xs text-blue-700 mt-1">
                Activity type: <span className="font-semibold">{activityType}</span>.
                Start with presets, then customize wording for your class context.
              </p>
            </div>
            <span className="text-xs px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-200">
              Suggested target: 4-6 rubrics
            </span>
          </div>

          <div className="mb-3">
            <p className="text-xs font-medium text-blue-900 mb-2">Quick Add Starter Presets</p>
            <div className="flex flex-wrap gap-2">
              {starterPresets.map((preset) => (
                <button
                  key={`preset-${preset.name}`}
                  type="button"
                  onClick={() => handleQuickAddPreset(preset)}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-100"
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-blue-900 mb-2">Apply From Your Library</p>
            {loadingLibrary ? (
              <p className="text-xs text-blue-700">Loading library rubrics...</p>
            ) : libraryRubrics.length === 0 ? (
              <p className="text-xs text-blue-700">No saved rubric in library yet. Save one from any rubric card below.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {libraryRubrics.map((lib) => (
                  <button
                    key={lib._id}
                    type="button"
                    onClick={() => handleApplyLibraryRubric(lib)}
                    className="text-xs px-3 py-1.5 rounded-full bg-white border border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    Use: {lib.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {rubrics.map((rubric) => (
        <div key={rubric._id} className="border rounded-lg p-4">
          {editing === rubric._id ? (
            /* Edit mode */
            <div className="space-y-3">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input font-semibold"
              />
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s}>
                    <label className="text-xs text-gray-500">Score {s}</label>
                    <textarea
                      value={form.criteria[`scale${s}`] || ''}
                      onChange={(e) => setForm({
                        ...form,
                        criteria: { ...form.criteria, [`scale${s}`]: e.target.value },
                      })}
                      rows={2}
                      className="input text-xs"
                    />
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSaveEdit(rubric._id)} className="btn-primary text-sm">Save</button>
                <button onClick={() => setEditing(null)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            /* View mode */
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">
                  {rubric.name}
                  {rubric.isLocked && <span className="ml-2 text-xs text-red-500">🔒 Locked</span>}
                </h4>
                <span className="text-xs text-gray-500">{isCriteriaFilled(rubric.criteria)}/5 scales filled</span>
                {!isLocked && (
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(rubric)} className="text-xs text-primary-600 hover:underline">Edit</button>
                    <button onClick={() => handleSaveToLibrary(rubric)} className="text-xs text-green-600 hover:underline">📚 Library</button>
                    <button onClick={() => handleDelete(rubric._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-5 gap-2 text-xs">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s} className={`p-2 rounded ${
                    s <= 2 ? 'bg-red-50' : s === 3 ? 'bg-yellow-50' : 'bg-green-50'
                  }`}>
                    <span className="font-medium">Score {s}:</span>
                    <p className="mt-0.5">{rubric.criteria[`scale${s}`] || '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {rubrics.length === 0 && <p className="text-gray-400 text-center py-4">No rubrics yet. Add one below.</p>}

      {/* Add new rubric */}
      {!isLocked && (
        <div>
          {showAdd ? (
            <div className="border-2 border-dashed border-primary-300 rounded-lg p-4 space-y-3">
              <input
                value={newRubric.name}
                onChange={(e) => setNewRubric({ ...newRubric, name: e.target.value })}
                placeholder="Rubric name"
                className="input font-semibold"
              />
              <p className="text-xs text-gray-500">Use observable names like "Content Depth" or "Communication Clarity".</p>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div key={s}>
                    <label className="text-xs text-gray-500">Score {s}</label>
                    <textarea
                      value={newRubric.criteria[`scale${s}`]}
                      onChange={(e) => setNewRubric({
                        ...newRubric,
                        criteria: { ...newRubric.criteria, [`scale${s}`]: e.target.value },
                      })}
                      rows={2}
                      className="input text-xs"
                      placeholder={
                        s === 1
                          ? 'What poor performance looks like...'
                          : s === 5
                          ? 'What excellent performance looks like...'
                          : 'Describe this performance level...'
                      }
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500">
                Completion: {isCriteriaFilled(newRubric.criteria)}/5 scales defined. Fill all scales for fairer evaluation.
              </p>
              <div className="flex gap-2">
                <button onClick={handleAdd} className="btn-primary text-sm">Add Rubric</button>
                <button onClick={() => setShowAdd(false)} className="btn-secondary text-sm">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowAdd(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-primary-400 hover:text-primary-600 transition text-sm">
              + Add Custom Rubric
            </button>
          )}
        </div>
      )}
    </div>
  );
}
