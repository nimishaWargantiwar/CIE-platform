// ==========================================
// Quiz Attempt Page — Public student quiz-taking interface
// ==========================================
// Students access via shared link (no authentication required).
// Collects roll number, name, then presents questions.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

// Use raw axios (not the auth-intercepted instance) since this is public
const publicApi = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default function QuizAttemptPage() {
  const { token } = useParams();
  const [step, setStep] = useState('identify'); // identify → quiz → submitted → error
  const [quizInfo, setQuizInfo] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [rollNo, setRollNo] = useState('');
  const [studentName, setStudentName] = useState('');
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [attemptStartedAt, setAttemptStartedAt] = useState(null);

  useEffect(() => { loadQuiz(); }, [token]);

  const loadQuiz = async () => {
    try {
      const { data } = await publicApi.get(`/quiz/attempt/${token}`);
      setQuizInfo(data.quiz);
      setQuestions(data.questions);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired quiz link.');
      setStep('error');
      setLoading(false);
    }
  };

  const handleStartQuiz = (e) => {
    e.preventDefault();
    if (!rollNo.trim() || !studentName.trim()) return;
    setAttemptStartedAt(new Date().toISOString());
    setStep('quiz');
  };

  const updateAnswer = (questionId, field, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], questionId, [field]: value },
    }));
  };

  const toggleMCQOption = (questionId, optionId) => {
    setAnswers(prev => {
      const current = prev[questionId]?.selectedOptions || [];

      // Single select behavior for MCQ
      let updated;
      if (current.includes(optionId)) {
        updated = current.filter(id => id !== optionId);
      } else {
        // Single select behavior (since we don't expose multi-correct info)
        updated = [optionId];
      }

      return {
        ...prev,
        [questionId]: { ...prev[questionId], questionId, selectedOptions: updated },
      };
    });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!confirm('Are you sure you want to submit? You cannot change your answers after submission.')) return;

    setSubmitting(true);
    try {
      const formattedAnswers = questions.map(q => ({
        questionId: q._id,
        answerText: answers[q._id]?.answerText || '',
        selectedOptions: answers[q._id]?.selectedOptions || [],
      }));

      await publicApi.post(`/quiz/attempt/${token}/submit`, {
        rollNo: rollNo.trim(),
        studentName: studentName.trim(),
        attemptStartedAt,
        answers: formattedAnswers,
      });

      setStep('submitted');
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Please try again.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const answeredCount = questions.filter(q => {
    const a = answers[q._id];
    if (!a) return false;
    if (q.questionType === 'mcq') return a.selectedOptions?.length > 0;
    return a.answerText?.trim().length > 0;
  }).length;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-red-700 mb-2">Quiz Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Submitted state
  if (step === 'submitted') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-green-700 mb-2">Quiz Submitted Successfully!</h1>
          <p className="text-gray-600 mb-4">Your answers have been recorded. Results will be shared by your faculty.</p>
          <div className="bg-green-50 rounded-lg p-4 text-left text-sm">
            <p><strong>Name:</strong> {studentName}</p>
            <p><strong>Roll No:</strong> {rollNo}</p>
            <p><strong>Questions Answered:</strong> {answeredCount}/{questions.length}</p>
          </div>
        </div>
      </div>
    );
  }

  // Identification step
  if (step === 'identify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📝</div>
            <h1 className="text-xl font-bold text-gray-900">{quizInfo?.activityName}</h1>
            <p className="text-gray-500 mt-1">{quizInfo?.subjectName} ({quizInfo?.subjectCode})</p>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 mb-6 text-sm text-blue-800">
            <div className="flex justify-between mb-1">
              <span>Questions:</span>
              <span className="font-semibold">{quizInfo?.questionCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Marks:</span>
              <span className="font-semibold">{quizInfo?.totalMarks}</span>
            </div>
          </div>

          <form onSubmit={handleStartQuiz} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <input
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Enter your roll number"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Enter your full name"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition"
            >
              Start Quiz →
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Quiz step — Render questions
  const q = questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{quizInfo?.activityName}</h1>
            <p className="text-xs text-gray-500">{studentName} ({rollNo})</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {answeredCount}/{questions.length} answered
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      </div>

      {/* Question navigation */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {questions.map((qq, idx) => {
            const isAnswered = (() => {
              const a = answers[qq._id];
              if (!a) return false;
              if (qq.questionType === 'mcq') return a.selectedOptions?.length > 0;
              return a.answerText?.trim().length > 0;
            })();
            return (
              <button
                key={qq._id}
                onClick={() => setCurrentQuestion(idx)}
                className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                  idx === currentQuestion
                    ? 'bg-primary-600 text-white'
                    : isAnswered
                      ? 'bg-green-100 text-green-700 border border-green-300'
                      : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        {/* Current Question */}
        {q && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-primary-100 text-primary-700 text-sm font-bold px-3 py-1 rounded-full">
                Q{currentQuestion + 1}
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${
                q.questionType === 'mcq' ? 'bg-blue-100 text-blue-700' :
                q.questionType === 'short' ? 'bg-green-100 text-green-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {q.questionType === 'mcq' ? 'Multiple Choice' : q.questionType === 'short' ? 'Short Answer' : 'Descriptive'}
              </span>
              <span className="text-sm text-gray-500 ml-auto">{q.marks} marks</span>
            </div>

            <p className="text-gray-900 text-lg mb-5 whitespace-pre-wrap">{q.questionText}</p>

            {/* MCQ Options */}
            {q.questionType === 'mcq' && (
              <div className="space-y-3">
                {q.options.map((opt, oi) => {
                  const selected = answers[q._id]?.selectedOptions?.includes(opt._id);
                  return (
                    <button
                      key={opt._id}
                      type="button"
                      onClick={() => toggleMCQOption(q._id, opt._id)}
                      className={`w-full text-left p-4 rounded-lg border-2 transition flex items-center gap-3 ${
                        selected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                        selected
                          ? 'border-primary-500 bg-primary-500 text-white'
                          : 'border-gray-300 text-gray-400'
                      }`}>
                        {selected ? '✓' : String.fromCharCode(65 + oi)}
                      </span>
                      <span className={selected ? 'text-primary-700 font-medium' : 'text-gray-700'}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short Answer */}
            {q.questionType === 'short' && (
              <input
                value={answers[q._id]?.answerText || ''}
                onChange={(e) => updateAnswer(q._id, 'answerText', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                placeholder="Type your answer here..."
              />
            )}

            {/* Descriptive Answer */}
            {q.questionType === 'descriptive' && (
              <textarea
                value={answers[q._id]?.answerText || ''}
                onChange={(e) => updateAnswer(q._id, 'answerText', e.target.value)}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-y"
                placeholder="Write your detailed answer here..."
              />
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-6 pt-4 border-t">
              <button
                onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
                disabled={currentQuestion === 0}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-40"
              >
                ← Previous
              </button>
              {currentQuestion < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : '✅ Submit Quiz'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
