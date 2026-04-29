// ==========================================
// Quiz Builder Page — Faculty creates quiz questions
// ==========================================

import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import Modal from '../components/Modal';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (MCQ)', icon: '☑️' },
  { value: 'short', label: 'Short Answer', icon: '✏️' },
  { value: 'descriptive', label: 'Descriptive', icon: '📝' },
];

export default function QuizBuilderPage() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [totalQuizMarks, setTotalQuizMarks] = useState(0);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);

  // Add question form
  const [form, setForm] = useState({
    questionType: 'mcq',
    questionText: '',
    options: [
      { label: '', isCorrect: false },
      { label: '', isCorrect: false },
      { label: '', isCorrect: false },
      { label: '', isCorrect: false },
    ],
    expectedAnswer: '',
    marks: 1,
    allowPartialScoring: false,
  });

  // Link generation form
  const [linkForm, setLinkForm] = useState({
    expiresInHours: 24,
    maxAttempts: 1,
    allowMultipleAttempts: false,
  });

  useEffect(() => { loadData(); }, [activityId]);

  const loadData = async () => {
    try {
      const [actRes, qRes] = await Promise.all([
        api.get(`/activities/${activityId}`),
        api.get(`/quiz/questions/${activityId}`),
      ]);
      setActivity(actRes.data.activity);
      setQuestions(qRes.data.questions);
      setTotalQuizMarks(qRes.data.totalQuizMarks);
    } catch (err) {
      toast.error('Failed to load quiz data');
      navigate('/activities');
    }
  };

  const loadTokens = async () => {
    try {
      const { data } = await api.get(`/quiz/tokens/${activityId}`);
      setTokens(data.tokens);
    } catch (err) {
      toast.error('Failed to load tokens');
    }
  };

  const resetForm = () => {
    setForm({
      questionType: 'mcq',
      questionText: '',
      options: [
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
        { label: '', isCorrect: false },
      ],
      expectedAnswer: '',
      marks: 1,
      allowPartialScoring: false,
    });
    setEditingQuestion(null);
  };

  const handleAddQuestion = async (e) => {
    e.preventDefault();

    // Validation
    if (form.questionType === 'mcq') {
      const filledOptions = form.options.filter(o => o.label.trim());
      if (filledOptions.length < 2) return toast.error('MCQ needs at least 2 options');
      if (!filledOptions.some(o => o.isCorrect)) return toast.error('Mark at least one correct option');
    }
    if (form.questionType === 'short' && !form.expectedAnswer.trim()) {
      return toast.error('Short answer needs expected keywords');
    }

    try {
      const payload = {
        activityId,
        questionType: form.questionType,
        questionText: form.questionText,
        marks: form.marks,
        allowPartialScoring: form.allowPartialScoring,
      };

      if (form.questionType === 'mcq') {
        payload.options = form.options.filter(o => o.label.trim());
      }
      if (form.questionType === 'short') {
        payload.expectedAnswer = form.expectedAnswer;
      }

      if (editingQuestion) {
        await api.put(`/quiz/questions/${editingQuestion._id}`, payload);
        toast.success('Question updated!');
      } else {
        await api.post('/quiz/questions', payload);
        toast.success('Question added!');
      }

      setShowAddModal(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving question');
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!confirm('Delete this question?')) return;
    try {
      await api.delete(`/quiz/questions/${id}`);
      toast.success('Question deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error');
    }
  };

  const handleEditQuestion = (q) => {
    setForm({
      questionType: q.questionType,
      questionText: q.questionText,
      options: q.questionType === 'mcq' && q.options.length > 0
        ? q.options.map(o => ({ label: o.label, isCorrect: o.isCorrect }))
        : [{ label: '', isCorrect: false }, { label: '', isCorrect: false }, { label: '', isCorrect: false }, { label: '', isCorrect: false }],
      expectedAnswer: q.expectedAnswer || '',
      marks: q.marks,
      allowPartialScoring: q.allowPartialScoring || false,
    });
    setEditingQuestion(q);
    setShowAddModal(true);
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/quiz/generate-link', {
        activityId,
        expiresInHours: linkForm.expiresInHours || undefined,
        maxAttempts: linkForm.maxAttempts,
        allowMultipleAttempts: linkForm.allowMultipleAttempts,
      });
      setGeneratedLink(data.quizLink);
      toast.success('Quiz link generated!');
      loadTokens();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating link');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    toast.success('Link copied to clipboard!');
  };

  const handleDeactivateToken = async (tokenId) => {
    try {
      await api.patch(`/quiz/tokens/${tokenId}/deactivate`);
      toast.success('Token deactivated');
      loadTokens();
    } catch (err) {
      toast.error('Error deactivating token');
    }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { label: '', isCorrect: false }] });
  };

  const removeOption = (idx) => {
    if (form.options.length <= 2) return toast.error('Minimum 2 options required');
    setForm({ ...form, options: form.options.filter((_, i) => i !== idx) });
  };

  const updateOption = (idx, field, value) => {
    const updated = [...form.options];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, options: updated });
  };

  if (!activity) return <div className="text-center py-12"><Spinner /></div>;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Quiz Builder</h1>
          <p className="text-gray-500 mt-1">
            {activity.name} • {activity.subject?.name} ({activity.subject?.code}) • {activity.totalMarks} marks
          </p>
        </div>
        <div className="flex gap-3">
          <Link to={`/activities/${activityId}`} className="btn-secondary">← Back to Activity</Link>
          <Link to={`/quiz/results/${activityId}`} className="btn-secondary">📊 View Results</Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Questions</p>
          <p className="text-2xl font-bold text-gray-900">{questions.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Quiz Marks</p>
          <p className="text-2xl font-bold text-gray-900">{totalQuizMarks}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Activity Total Marks</p>
          <p className="text-2xl font-bold text-primary-600">{activity.totalMarks}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        {activity.status !== 'locked' && (
          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn-primary">
            + Add Question
          </button>
        )}
        <button onClick={() => { loadTokens(); setShowLinkModal(true); setGeneratedLink(''); }} className="btn-secondary">
          🔗 Generate Quiz Link
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((q, idx) => (
          <div key={q._id} className="bg-white rounded-xl border p-5 hover:shadow-sm transition">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  q.questionType === 'mcq' ? 'bg-blue-100 text-blue-700' :
                  q.questionType === 'short' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {QUESTION_TYPES.find(t => t.value === q.questionType)?.label || q.questionType}
                </span>
                <span className="text-sm text-gray-500 font-medium">{q.marks} marks</span>
                {q.allowPartialScoring && (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">Partial scoring</span>
                )}
              </div>
              {activity.status !== 'locked' && (
                <div className="flex gap-2">
                  <button onClick={() => handleEditQuestion(q)} className="text-xs text-primary-600 hover:underline">Edit</button>
                  <button onClick={() => handleDeleteQuestion(q._id)} className="text-xs text-red-600 hover:underline">Delete</button>
                </div>
              )}
            </div>

            <p className="text-gray-900 mb-3 whitespace-pre-wrap">{q.questionText}</p>

            {/* MCQ Options */}
            {q.questionType === 'mcq' && q.options.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <div key={opt._id} className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
                    opt.isCorrect ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${
                      opt.isCorrect ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300'
                    }`}>
                      {opt.isCorrect ? '✓' : String.fromCharCode(65 + oi)}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Short answer expected keywords */}
            {q.questionType === 'short' && q.expectedAnswer && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-sm">
                <span className="font-medium text-green-800">Expected keywords:</span>{' '}
                <span className="text-green-700">{q.expectedAnswer}</span>
              </div>
            )}

            {/* Descriptive note */}
            {q.questionType === 'descriptive' && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-2 text-sm text-purple-700">
                📝 Descriptive — auto-scored based on answer length, faculty can override scores
              </div>
            )}
          </div>
        ))}

        {questions.length === 0 && (
          <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-dashed">
            No questions yet. Click "Add Question" to begin building your quiz.
          </div>
        )}
      </div>

      {/* Add/Edit Question Modal */}
      <Modal show={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title={editingQuestion ? 'Edit Question' : 'Add Quiz Question'} wide>
        <form onSubmit={handleAddQuestion} className="space-y-4">
          {/* Question Type */}
          <div>
            <label className="label">Question Type</label>
            <div className="flex gap-3">
              {QUESTION_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, questionType: t.value })}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-medium transition ${
                    form.questionType === t.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <span className="text-lg">{t.icon}</span>
                  <p className="mt-1">{t.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="label">Question Text</label>
            <textarea
              value={form.questionText}
              onChange={(e) => setForm({ ...form, questionText: e.target.value })}
              required
              rows={3}
              className="input"
              placeholder="Enter your question here..."
            />
          </div>

          {/* MCQ Options */}
          {form.questionType === 'mcq' && (
            <div>
              <label className="label">Options (mark correct answer)</label>
              <div className="space-y-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateOption(idx, 'isCorrect', !opt.isCorrect)}
                      className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition ${
                        opt.isCorrect
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-300 text-gray-400 hover:border-green-400'
                      }`}
                    >
                      {opt.isCorrect ? '✓' : String.fromCharCode(65 + idx)}
                    </button>
                    <input
                      value={opt.label}
                      onChange={(e) => updateOption(idx, 'label', e.target.value)}
                      className="input flex-1"
                      placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-600">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addOption} className="text-sm text-primary-600 hover:underline mt-2">
                + Add Option
              </button>
            </div>
          )}

          {/* Short Answer — Expected Keywords */}
          {form.questionType === 'short' && (
            <div>
              <label className="label">Expected Answer Keywords</label>
              <input
                value={form.expectedAnswer}
                onChange={(e) => setForm({ ...form, expectedAnswer: e.target.value })}
                className="input"
                placeholder="keyword1, keyword2, keyword3 (comma-separated)"
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated keywords. Student answer is matched against these.</p>
            </div>
          )}

          {/* Descriptive — Note */}
          {form.questionType === 'descriptive' && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-700">
              📝 Descriptive questions are scored based on answer length as a baseline. Faculty can override scores after submission.
            </div>
          )}

          {/* Marks & Partial Scoring */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Marks</label>
              <input
                type="number"
                min="1"
                value={form.marks}
                onChange={(e) => setForm({ ...form, marks: parseInt(e.target.value) || 1 })}
                required
                className="input"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.allowPartialScoring}
                  onChange={(e) => setForm({ ...form, allowPartialScoring: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">Allow partial scoring</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">
              {editingQuestion ? 'Update Question' : 'Add Question'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Generate Link Modal */}
      <Modal show={showLinkModal} onClose={() => setShowLinkModal(false)} title="Generate Quiz Link" wide>
        <div className="space-y-6">
          {/* Link settings */}
          <form onSubmit={handleGenerateLink} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Expires After (hours)</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={linkForm.expiresInHours}
                  onChange={(e) => setLinkForm({ ...linkForm, expiresInHours: parseFloat(e.target.value) || 24 })}
                  className="input"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
              </div>
              <div>
                <label className="label">Max Attempts per Student</label>
                <input
                  type="number"
                  min="1"
                  value={linkForm.maxAttempts}
                  onChange={(e) => setLinkForm({ ...linkForm, maxAttempts: parseInt(e.target.value) || 1 })}
                  className="input"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={linkForm.allowMultipleAttempts}
                onChange={(e) => setLinkForm({ ...linkForm, allowMultipleAttempts: e.target.checked })}
                className="w-4 h-4 text-primary-600"
              />
              <span className="text-sm text-gray-700">Allow multiple attempts per student</span>
            </label>
            <button type="submit" className="btn-primary w-full">🔗 Generate New Link</button>
          </form>

          {/* Generated Link */}
          {generatedLink && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-800 mb-2">✅ Quiz Link Generated!</p>
              <div className="flex items-center gap-2">
                <input value={generatedLink} readOnly className="input flex-1 text-sm bg-white" />
                <button onClick={handleCopyLink} className="btn-primary text-sm whitespace-nowrap">📋 Copy</button>
              </div>
              <p className="text-xs text-green-700 mt-2">Share this link with students via WhatsApp or any messaging platform.</p>
            </div>
          )}

          {/* Existing Tokens */}
          {tokens.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Active Links ({tokens.length})</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tokens.map((t) => (
                  <div key={t._id} className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                    t.isValid ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}>
                    <div>
                      <p className="font-mono text-xs text-gray-500">{t.token.substring(0, 16)}...</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Uses: {t.totalUses} • {t.expiresAt ? `Expires: ${new Date(t.expiresAt).toLocaleString()}` : 'No expiry'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => { navigator.clipboard.writeText(t.quizLink); toast.success('Copied!'); }}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        Copy
                      </button>
                      {t.isValid && t.isActive && (
                        <button
                          onClick={() => handleDeactivateToken(t._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Deactivate
                        </button>
                      )}
                      {!t.isValid && <span className="text-xs text-red-400">Expired</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

function Spinner() {
  return <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />;
}
