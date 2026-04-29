// ==========================================
// Activity Templates Page (Admin only)
// ==========================================

import { useState, useEffect } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';
import { isYouTubeUrl } from '../utils/videoEmbed';

const EMPTY_RUBRIC = {
  name: '',
  criteria: { scale1: '', scale2: '', scale3: '', scale4: '', scale5: '' },
};

const EMPTY_GUIDE_FORM = {
  objective: '',
  videoUrl: '',
  outcomesText: '',
  preparationChecklistText: '',
  rubricMappingTipsText: '',
  commonMistakesText: '',
  bestPracticesText: '',
  timingBreakdown: [{ phase: '', durationMinutes: 10 }],
  conductSteps: [{ title: '', durationMinutes: 10, detailsText: '' }],
};

const EMPTY_FORM = {
  activityType: '',
  description: '',
  guidelines: '',
  defaultRubrics: [EMPTY_RUBRIC],
  learningGuide: { ...EMPTY_GUIDE_FORM },
  isGuidePublished: false,
  guidePriority: 100,
};

const toLines = (value = '') =>
  `${value}`
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

const formatApiError = (err, fallback = 'Error') => {
  const data = err?.response?.data;
  if (!data) return fallback;
  if (Array.isArray(data.errors) && data.errors.length > 0) return data.errors[0];
  return data.message || fallback;
};

function templateToGuideForm(template) {
  const guide = template.learningGuide || {};
  return {
    _id: template._id,
    activityType: template.activityType || '',
    description: template.description || '',
    guidelines: template.guidelines || '',
    isGuidePublished: !!template.isGuidePublished,
    guidePriority: template.guidePriority || 100,
    learningGuide: {
      objective: guide.objective || '',
      videoUrl: guide.videoUrl || '',
      outcomesText: (guide.outcomes || []).join('\n'),
      preparationChecklistText: (guide.preparationChecklist || []).join('\n'),
      rubricMappingTipsText: (guide.rubricMappingTips || []).join('\n'),
      commonMistakesText: (guide.commonMistakes || []).join('\n'),
      bestPracticesText: (guide.bestPractices || []).join('\n'),
      timingBreakdown: (guide.timingBreakdown && guide.timingBreakdown.length)
        ? guide.timingBreakdown.map((item) => ({
          phase: item.phase || '',
          durationMinutes: item.durationMinutes || 10,
        }))
        : [{ phase: '', durationMinutes: 10 }],
      conductSteps: (guide.conductSteps && guide.conductSteps.length)
        ? guide.conductSteps.map((item) => ({
          title: item.title || '',
          durationMinutes: item.durationMinutes || 10,
          detailsText: (item.details || []).join('\n'),
        }))
        : [{ title: '', durationMinutes: 10, detailsText: '' }],
    },
  };
}

function buildTemplatePayload(form) {
  return {
    activityType: form.activityType,
    description: form.description,
    guidelines: form.guidelines,
    defaultRubrics: form.defaultRubrics,
    isGuidePublished: !!form.isGuidePublished,
    guidePriority: Number(form.guidePriority) || 100,
    learningGuide: {
      objective: form.learningGuide.objective,
      videoUrl: form.learningGuide.videoUrl?.trim() || '',
      outcomes: toLines(form.learningGuide.outcomesText),
      preparationChecklist: toLines(form.learningGuide.preparationChecklistText),
      timingBreakdown: form.learningGuide.timingBreakdown
        .filter((item) => item.phase?.trim() && Number(item.durationMinutes) > 0)
        .map((item) => ({
          phase: item.phase.trim(),
          durationMinutes: Number(item.durationMinutes),
        })),
      conductSteps: form.learningGuide.conductSteps
        .filter((item) => item.title?.trim())
        .map((item) => ({
          title: item.title.trim(),
          durationMinutes: Number(item.durationMinutes) || undefined,
          details: toLines(item.detailsText),
        })),
      rubricMappingTips: toLines(form.learningGuide.rubricMappingTipsText),
      commonMistakes: toLines(form.learningGuide.commonMistakesText),
      bestPractices: toLines(form.learningGuide.bestPracticesText),
    },
  };
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showEditGuideModal, setShowEditGuideModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editGuideForm, setEditGuideForm] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const { data } = await api.get('/admin/templates');
    setTemplates(data);
  };

  const addRubric = () => {
    setForm((f) => ({
      ...f,
      defaultRubrics: [...f.defaultRubrics, { ...EMPTY_RUBRIC }],
    }));
  };

  const removeRubric = (idx) => {
    setForm((f) => ({
      ...f,
      defaultRubrics: f.defaultRubrics.filter((_, i) => i !== idx),
    }));
  };

  const updateRubric = (idx, field, value) => {
    setForm((f) => {
      const updated = [...f.defaultRubrics];
      if (field === 'name') {
        updated[idx].name = value;
      } else {
        updated[idx].criteria[field] = value;
      }
      return { ...f, defaultRubrics: updated };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const guideVideo = form.learningGuide.videoUrl?.trim() || '';
    if (guideVideo && !isYouTubeUrl(guideVideo)) {
      toast.error('Learning guide video must be a valid YouTube link.');
      return;
    }

    try {
      await api.post('/admin/templates', buildTemplatePayload(form));
      toast.success('Template created!');
      setShowModal(false);
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to create template'));
    }
  };

  const openEditGuide = (template) => {
    setEditGuideForm(templateToGuideForm(template));
    setShowEditGuideModal(true);
  };

  const handleGuideUpdate = async (e) => {
    e.preventDefault();
    if (!editGuideForm?._id) return;

    const guideVideo = editGuideForm.learningGuide.videoUrl?.trim() || '';
    if (guideVideo && !isYouTubeUrl(guideVideo)) {
      toast.error('Learning guide video must be a valid YouTube link.');
      return;
    }

    try {
      const payload = buildTemplatePayload({
        ...EMPTY_FORM,
        ...editGuideForm,
        defaultRubrics: [],
      });

      await api.put(`/admin/templates/${editGuideForm._id}`, {
        description: payload.description,
        guidelines: payload.guidelines,
        learningGuide: payload.learningGuide,
        isGuidePublished: payload.isGuidePublished,
        guidePriority: payload.guidePriority,
      });
      toast.success('Learning guide updated!');
      setShowEditGuideModal(false);
      setEditGuideForm(null);
      load();
    } catch (err) {
      toast.error(formatApiError(err, 'Failed to update learning guide'));
    }
  };

  const addTimingBlock = (setState) => {
    setState((prev) => ({
      ...prev,
      learningGuide: {
        ...prev.learningGuide,
        timingBreakdown: [...prev.learningGuide.timingBreakdown, { phase: '', durationMinutes: 10 }],
      },
    }));
  };

  const removeTimingBlock = (idx, setState) => {
    setState((prev) => ({
      ...prev,
      learningGuide: {
        ...prev.learningGuide,
        timingBreakdown: prev.learningGuide.timingBreakdown.filter((_, i) => i !== idx),
      },
    }));
  };

  const updateTimingBlock = (idx, field, value, setState) => {
    setState((prev) => {
      const next = [...prev.learningGuide.timingBreakdown];
      next[idx] = { ...next[idx], [field]: value };
      return {
        ...prev,
        learningGuide: { ...prev.learningGuide, timingBreakdown: next },
      };
    });
  };

  const addConductStep = (setState) => {
    setState((prev) => ({
      ...prev,
      learningGuide: {
        ...prev.learningGuide,
        conductSteps: [...prev.learningGuide.conductSteps, { title: '', durationMinutes: 10, detailsText: '' }],
      },
    }));
  };

  const removeConductStep = (idx, setState) => {
    setState((prev) => ({
      ...prev,
      learningGuide: {
        ...prev.learningGuide,
        conductSteps: prev.learningGuide.conductSteps.filter((_, i) => i !== idx),
      },
    }));
  };

  const updateConductStep = (idx, field, value, setState) => {
    setState((prev) => {
      const next = [...prev.learningGuide.conductSteps];
      next[idx] = { ...next[idx], [field]: value };
      return {
        ...prev,
        learningGuide: { ...prev.learningGuide, conductSteps: next },
      };
    });
  };

  const guideDuration = (template) => {
    const blocks = template.learningGuide?.timingBreakdown || [];
    return blocks.reduce((sum, item) => sum + (Number(item.durationMinutes) || 0), 0);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await api.delete(`/admin/templates/${id}`);
      toast.success('Deleted!');
      load();
    } catch (err) {
      toast.error('Error');
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Activity Templates</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary">+ Create Template</button>
      </div>

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t._id} className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-lg">{t.activityType}</h3>
                <p className="text-sm text-gray-500">{t.description}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => openEditGuide(t)} className="text-primary-600 text-sm hover:underline">
                  Edit Guide
                </button>
                <button onClick={() => handleDelete(t._id)} className="text-red-600 text-sm hover:underline">Delete</button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-2 text-xs">
              <span className="bg-gray-100 px-2 py-1 rounded">Rubrics: {t.defaultRubrics?.length || 0}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Guide Priority: {t.guidePriority || 100}</span>
              <span className="bg-gray-100 px-2 py-1 rounded">Duration: ~{guideDuration(t)} min</span>
              <span className={`px-2 py-1 rounded ${t.isGuidePublished ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {t.isGuidePublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {t.defaultRubrics?.map((r, i) => (
                <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded">{r.name}</span>
              ))}
            </div>
          </div>
        ))}
        {templates.length === 0 && <p className="text-center text-gray-400 py-8">No templates yet.</p>}
      </div>

      <Modal show={showModal} onClose={() => setShowModal(false)} title="Create Activity Template" wide>
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="label">Activity Type (e.g. PPT, GD, Viva)</label>
            <input value={form.activityType} onChange={(e) => setForm({ ...form, activityType: e.target.value })} required className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input" />
          </div>
          <div>
            <label className="label">Guidelines</label>
            <textarea value={form.guidelines} onChange={(e) => setForm({ ...form, guidelines: e.target.value })} rows={3} className="input" />
          </div>

          <LearningGuideFields
            form={form}
            setForm={setForm}
            addTimingBlock={addTimingBlock}
            removeTimingBlock={removeTimingBlock}
            updateTimingBlock={updateTimingBlock}
            addConductStep={addConductStep}
            removeConductStep={removeConductStep}
            updateConductStep={updateConductStep}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isGuidePublished}
                onChange={(e) => setForm({ ...form, isGuidePublished: e.target.checked })}
              />
              Publish this guide for faculty
            </label>
            <div>
              <label className="label">Guide Priority (lower appears first)</label>
              <input
                type="number"
                min="1"
                max="9999"
                value={form.guidePriority}
                onChange={(e) => setForm({ ...form, guidePriority: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Default Rubrics</label>
              <button type="button" onClick={addRubric} className="text-sm text-primary-600 hover:underline">+ Add Rubric</button>
            </div>
            {form.defaultRubrics.map((r, idx) => (
              <div key={idx} className="border rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between mb-2">
                  <input
                    value={r.name}
                    onChange={(e) => updateRubric(idx, 'name', e.target.value)}
                    placeholder="Rubric name"
                    className="input flex-1 mr-2"
                    required
                  />
                  <button type="button" onClick={() => removeRubric(idx)} className="text-red-500 text-sm">✕</button>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <input
                      key={s}
                      value={r.criteria[`scale${s}`]}
                      onChange={(e) => updateRubric(idx, `scale${s}`, e.target.value)}
                      placeholder={`Score ${s}`}
                      className="input text-xs"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Create Template</button>
          </div>
        </form>
      </Modal>

      <Modal show={showEditGuideModal} onClose={() => setShowEditGuideModal(false)} title="Edit Learning Guide" wide>
        {editGuideForm && (
          <form onSubmit={handleGuideUpdate} className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label className="label">Activity Type</label>
              <input value={editGuideForm.activityType} disabled className="input bg-gray-100" />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                value={editGuideForm.description}
                onChange={(e) => setEditGuideForm({ ...editGuideForm, description: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">General Guidelines</label>
              <textarea
                value={editGuideForm.guidelines}
                onChange={(e) => setEditGuideForm({ ...editGuideForm, guidelines: e.target.value })}
                rows={3}
                className="input"
              />
            </div>

            <LearningGuideFields
              form={editGuideForm}
              setForm={setEditGuideForm}
              addTimingBlock={addTimingBlock}
              removeTimingBlock={removeTimingBlock}
              updateTimingBlock={updateTimingBlock}
              addConductStep={addConductStep}
              removeConductStep={removeConductStep}
              updateConductStep={updateConductStep}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={editGuideForm.isGuidePublished}
                  onChange={(e) => setEditGuideForm({ ...editGuideForm, isGuidePublished: e.target.checked })}
                />
                Publish this guide for faculty
              </label>
              <div>
                <label className="label">Guide Priority (lower appears first)</label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={editGuideForm.guidePriority}
                  onChange={(e) => setEditGuideForm({ ...editGuideForm, guidePriority: e.target.value })}
                  className="input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowEditGuideModal(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Save Guide</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

function LearningGuideFields({
  form,
  setForm,
  addTimingBlock,
  removeTimingBlock,
  updateTimingBlock,
  addConductStep,
  removeConductStep,
  updateConductStep,
}) {
  return (
    <div className="rounded-lg border p-4 space-y-4">
      <h3 className="font-semibold text-gray-900">Learning Guide</h3>

      <div>
        <label className="label">Objective</label>
        <textarea
          rows={2}
          value={form.learningGuide.objective}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, objective: e.target.value },
          })}
          className="input"
        />
      </div>

      <div>
        <label className="label">Outcomes (one per line)</label>
        <textarea
          rows={3}
          value={form.learningGuide.outcomesText}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, outcomesText: e.target.value },
          })}
          className="input"
        />
      </div>

      <div>
        <label className="label">Video Link (YouTube)</label>
        <input
          type="url"
          value={form.learningGuide.videoUrl || ''}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, videoUrl: e.target.value },
          })}
          className="input"
          placeholder="https://youtu.be/69JpdGqM3NM"
        />
        <p className="text-xs text-gray-500 mt-1">If valid, this video appears embedded below guide/activity descriptions.</p>
        <p className="text-xs text-gray-500 mt-1">Only YouTube links are supported right now.</p>
      </div>

      <div>
        <label className="label">Preparation Checklist (one per line)</label>
        <textarea
          rows={4}
          value={form.learningGuide.preparationChecklistText}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, preparationChecklistText: e.target.value },
          })}
          className="input"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Time Split</label>
          <button type="button" onClick={() => addTimingBlock(setForm)} className="text-sm text-primary-600 hover:underline">
            + Add Time Block
          </button>
        </div>
        <div className="space-y-2">
          {form.learningGuide.timingBreakdown.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={item.phase}
                onChange={(e) => updateTimingBlock(idx, 'phase', e.target.value, setForm)}
                placeholder="Phase name"
                className="input col-span-8"
              />
              <input
                type="number"
                min="1"
                max="600"
                value={item.durationMinutes}
                onChange={(e) => updateTimingBlock(idx, 'durationMinutes', e.target.value, setForm)}
                className="input col-span-3"
              />
              <button type="button" onClick={() => removeTimingBlock(idx, setForm)} className="text-red-500 text-sm">✕</button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">Step-by-Step Conduct Flow</label>
          <button type="button" onClick={() => addConductStep(setForm)} className="text-sm text-primary-600 hover:underline">
            + Add Step
          </button>
        </div>
        <div className="space-y-3">
          {form.learningGuide.conductSteps.map((step, idx) => (
            <div key={idx} className="border rounded-lg p-3">
              <div className="grid grid-cols-12 gap-2 mb-2 items-center">
                <input
                  value={step.title}
                  onChange={(e) => updateConductStep(idx, 'title', e.target.value, setForm)}
                  placeholder="Step title"
                  className="input col-span-8"
                />
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={step.durationMinutes}
                  onChange={(e) => updateConductStep(idx, 'durationMinutes', e.target.value, setForm)}
                  className="input col-span-3"
                />
                <button type="button" onClick={() => removeConductStep(idx, setForm)} className="text-red-500 text-sm">✕</button>
              </div>
              <textarea
                rows={2}
                placeholder="Step details (one per line)"
                value={step.detailsText}
                onChange={(e) => updateConductStep(idx, 'detailsText', e.target.value, setForm)}
                className="input"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Rubric Mapping Tips (one per line)</label>
        <textarea
          rows={3}
          value={form.learningGuide.rubricMappingTipsText}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, rubricMappingTipsText: e.target.value },
          })}
          className="input"
        />
      </div>

      <div>
        <label className="label">Common Mistakes (one per line)</label>
        <textarea
          rows={3}
          value={form.learningGuide.commonMistakesText}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, commonMistakesText: e.target.value },
          })}
          className="input"
        />
      </div>

      <div>
        <label className="label">Best Practices (one per line)</label>
        <textarea
          rows={3}
          value={form.learningGuide.bestPracticesText}
          onChange={(e) => setForm({
            ...form,
            learningGuide: { ...form.learningGuide, bestPracticesText: e.target.value },
          })}
          className="input"
        />
      </div>
    </div>
  );
}
