// ==========================================
// Dashboard Page
// ==========================================

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import {
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineAcademicCap,
} from 'react-icons/hi';

function StatCard({ title, value, icon: Icon, color }) {
  return (
    <div className="panel-card flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{title}</p>
      </div>
    </div>
  );
}

function BadgeCard({ badge }) {
  return (
    <div className={`rounded-xl border p-3.5 ${badge.earned ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{badge.title}</p>
        <span className={`text-xs px-2 py-1 rounded-full ${badge.earned ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>
          {badge.earned ? 'Earned' : `${badge.current}/${badge.target}`}
        </span>
      </div>
      <p className="text-xs text-slate-600 mt-1">{badge.subtitle}</p>
      <div className="mt-2 h-1.5 rounded-full bg-white border border-slate-200 overflow-hidden">
        <div
          className={`h-full ${badge.earned ? 'bg-emerald-500' : 'bg-sky-500'}`}
          style={{ width: `${badge.progressPercent}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [leaderboard, setLeaderboard] = useState({ top: [], me: null });
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [years, setYears] = useState([]);
  const [selectedYear, setSelectedYear] = useState('');
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const onboardingSeenKey = useMemo(
    () => (user?._id ? `faculty_onboarding_seen_${user._id}` : ''),
    [user?._id]
  );

  const badgeSeenKey = useMemo(
    () => (user?._id ? `faculty_badges_seen_${user._id}` : ''),
    [user?._id]
  );

  const leaderboardVisibleKey = useMemo(
    () => (user?._id ? `faculty_leaderboard_visible_${user._id}` : ''),
    [user?._id]
  );

  useEffect(() => {
    api.get('/academic-years').then(({ data }) => {
      setYears(data);
      if (data.length) setSelectedYear(data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (selectedYear) loadData();
  }, [selectedYear]);

  useEffect(() => {
    if (!user?._id || isAdmin || !onboardingSeenKey) return;

    try {
      const hasSeenOnboarding = localStorage.getItem(onboardingSeenKey) === '1';
      setShowOnboardingModal(!hasSeenOnboarding);

      if (leaderboardVisibleKey) {
        const preferredVisibility = localStorage.getItem(leaderboardVisibleKey) === '1';
        setShowLeaderboard(preferredVisibility);
      }
    } catch (err) {
      console.warn('Failed to read onboarding state', err);
    }
  }, [user?._id, isAdmin, onboardingSeenKey, leaderboardVisibleKey]);

  const loadOnboardingProgress = async () => {
    if (isAdmin) return;
    try {
      const { data } = await api.get('/onboarding/faculty/progress');
      setOnboardingProgress(data?.progress || null);
    } catch (err) {
      console.warn('Failed to load onboarding progress', err);
    }
  };

  const markGuideVisited = async (activityType = '') => {
    try {
      await api.post('/learning/guides/view', { activityType });
    } catch (err) {
      console.warn('Failed to mark guide view', err);
    } finally {
      loadOnboardingProgress();
    }
  };

  const loadLeaderboard = async () => {
    if (isAdmin || !showLeaderboard) return;

    setLeaderboardLoading(true);
    try {
      const { data } = await api.get('/onboarding/faculty/leaderboard');
      setLeaderboard(data?.leaderboard || { top: [], me: null });
    } catch (err) {
      console.warn('Failed to load leaderboard', err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  const toggleLeaderboardVisibility = () => {
    const next = !showLeaderboard;
    setShowLeaderboard(next);

    if (!leaderboardVisibleKey) return;
    try {
      localStorage.setItem(leaderboardVisibleKey, next ? '1' : '0');
    } catch (err) {
      console.warn('Failed to persist leaderboard preference', err);
    }
  };

  const closeOnboardingModal = () => {
    setShowOnboardingModal(false);
    if (!onboardingSeenKey) return;
    try {
      localStorage.setItem(onboardingSeenKey, '1');
    } catch (err) {
      console.warn('Failed to persist onboarding modal state', err);
    }
  };

  const loadData = async () => {
    try {
      if (isAdmin) {
        const { data } = await api.get('/admin/stats');
        setStats(data);
      }
      const { data: subData } = await api.get(`/subjects?academicYear=${selectedYear}`);
      const { data: actData } = await api.get('/activities');
      // Prefer subject-based filtering, but fall back to activity.subject.academicYear
      // so newly created activities still appear even if subject ownership differs.
      const subjectIds = new Set(subData.map((s) => String(s._id)));
      const filtered = actData.filter((a) => {
        const subjectId = String(a.subject?._id || a.subject || '');
        if (subjectIds.size > 0 && subjectId) return subjectIds.has(subjectId);

        const activityYearId = String(a.subject?.academicYear?._id || a.subject?.academicYear || '');
        return activityYearId === String(selectedYear);
      });

      let resolvedSubjects = subData;
      if (resolvedSubjects.length === 0 && filtered.length > 0) {
        const subjectMap = new Map();
        filtered.forEach((activity) => {
          const subj = activity.subject;
          if (!subj) return;

          const subjectId = String(subj._id || '');
          if (!subjectId || subjectMap.has(subjectId)) return;

          subjectMap.set(subjectId, {
            _id: subjectId,
            name: subj.name,
            code: subj.code,
            class: subj.class,
            faculty: activity.faculty,
          });
        });
        resolvedSubjects = Array.from(subjectMap.values());
      }

      setSubjects(resolvedSubjects);
      setActivities(filtered.slice(0, 10));

      if (!isAdmin) {
        loadOnboardingProgress();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isAdmin && showLeaderboard) {
      loadLeaderboard();
    }
  }, [isAdmin, showLeaderboard]);

  const progressStepMap = new Map((onboardingProgress?.steps || []).map((step) => [step.id, step]));

  const hasCreatedActivity = progressStepMap.get('create')?.completed || false;
  const hasSubmittedActivity = progressStepMap.get('submit')?.completed || false;
  const hasLockedActivity = progressStepMap.get('grade')?.completed || false;
  const hasVisitedGuide = progressStepMap.get('guide')?.completed || false;

  const firstActivityId = activities[0]?._id || null;
  const firstReviewReadyActivity = activities.find((activity) => activity.status !== 'draft')?._id || firstActivityId;

  const onboardingSteps = [
    {
      id: 'guide',
      title: 'Review one conduction guide',
      hint: 'Learning Center shows activity-wise best practices and timing.',
      completed: hasVisitedGuide,
      cta: 'Open Guide',
      to: '/learning',
      onClick: () => markGuideVisited('General'),
    },
    {
      id: 'create',
      title: 'Create your first activity',
      hint: 'Start with a template-backed activity and default rubrics.',
      completed: hasCreatedActivity,
      cta: 'Create Activity',
      to: '/activities?create=1',
    },
    {
      id: 'submit',
      title: 'Submit or lock one activity',
      hint: 'Finalize rubrics once you are ready to evaluate.',
      completed: hasSubmittedActivity,
      cta: firstReviewReadyActivity ? 'Open Activity' : 'Create First Activity',
      to: firstReviewReadyActivity ? `/activities/${firstReviewReadyActivity}` : '/activities?create=1',
    },
    {
      id: 'grade',
      title: 'Open grading workspace',
      hint: 'Start scoring students from the grading grid.',
      completed: hasLockedActivity,
      cta: firstReviewReadyActivity ? 'Open Grading' : 'Prepare Activity',
      to: firstReviewReadyActivity ? `/grading/${firstReviewReadyActivity}` : '/activities?create=1',
    },
  ];

  const completedSteps = onboardingProgress?.summary?.completedSteps ?? onboardingSteps.filter((step) => step.completed).length;
  const totalSteps = onboardingProgress?.summary?.totalSteps ?? onboardingSteps.length;
  const progressPercent = onboardingProgress?.summary?.progressPercent ?? Math.round((completedSteps / onboardingSteps.length) * 100);
  const gamification = onboardingProgress?.gamification || null;
  const badges = gamification?.badges || [];
  const earnedBadgeCount = badges.filter((badge) => badge.earned).length;
  const monthlyGoals = onboardingProgress?.monthlyGoals || [];
  const monthlySummary = onboardingProgress?.monthlySummary || null;
  const timeline = onboardingProgress?.timeline || [];

  useEffect(() => {
    if (isAdmin || !badgeSeenKey || badges.length === 0) return;

    const earnedIds = badges.filter((badge) => badge.earned).map((badge) => badge.id);

    try {
      const raw = localStorage.getItem(badgeSeenKey);
      if (!raw) {
        localStorage.setItem(badgeSeenKey, JSON.stringify(earnedIds));
        return;
      }

      const seen = new Set(JSON.parse(raw));
      const newlyUnlocked = badges.filter((badge) => badge.earned && !seen.has(badge.id));

      newlyUnlocked.forEach((badge) => {
        toast.success(`Badge unlocked: ${badge.title}`);
      });

      const updated = Array.from(new Set([...seen, ...earnedIds]));
      localStorage.setItem(badgeSeenKey, JSON.stringify(updated));
    } catch (err) {
      console.warn('Failed to process badge unlock state', err);
    }
  }, [badges, badgeSeenKey, isAdmin]);

  return (
    <div className="space-y-6">
      <div className="panel-card-strong flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-700/80">Faculty Overview</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Welcome back, {user?.name}.</h1>
          <p className="mt-1 text-slate-600">
            {isAdmin ? 'Admin Dashboard' : 'Faculty Dashboard'} for streamlined CIE planning, grading, and execution.
          </p>
        </div>
        <div className="min-w-[210px]">
          <label className="label">Academic Year</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} className="input">
            {years.map((y) => <option key={y._id} value={y._id}>{y.name}</option>)}
          </select>
        </div>
      </div>

      {!isAdmin && (
        <div className="panel-card">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Faculty Onboarding Progress</h2>
              <p className="text-sm text-slate-500 mt-1">
                Complete these first steps to confidently run your CIE workflow.
              </p>
            </div>
            <button onClick={() => setShowOnboardingModal(true)} className="btn-secondary">View Quick Walkthrough</button>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-1">
              <span>{completedSteps}/{totalSteps} steps completed</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-600 transition-all" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {onboardingSteps.map((step, index) => (
              <div key={step.id} className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3 bg-white/80">
                <div className="flex gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${step.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{step.hint}</p>
                  </div>
                </div>
                <Link
                  to={step.to}
                  onClick={step.onClick}
                  className="text-xs text-sky-700 font-medium whitespace-nowrap hover:underline"
                >
                  {step.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && gamification && (
        <div className="panel-card">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Faculty Milestones</h2>
              <p className="text-sm text-slate-500 mt-1">
                Track your progress with professional badges and completion points.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">
              Level {gamification.level} • {earnedBadgeCount}/{badges.length} badges
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Total Points</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">{gamification.points}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Next Level At</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">{gamification.nextLevelAt}</p>
            </div>
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">Points To Next</p>
              <p className="text-xl font-semibold text-slate-900 mt-1">{gamification.pointsToNextLevel}</p>
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
              <span>Level progress</span>
              <span>{gamification.levelProgressPercent}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-600 transition-all" style={{ width: `${gamification.levelProgressPercent}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {badges.map((badge) => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {!isAdmin && monthlyGoals.length > 0 && (
        <div className="panel-card">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Monthly Goals</h2>
              <p className="text-sm text-slate-500 mt-1">
                Keep a steady rhythm with small monthly goals for learning and execution.
              </p>
            </div>
            <span className="text-xs px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-slate-700">
              {monthlySummary?.completedGoals || 0}/{monthlySummary?.totalGoals || monthlyGoals.length} completed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {monthlyGoals.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">{goal.title}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${goal.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {goal.completed ? 'Done' : `${goal.current}/${goal.target}`}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{goal.subtitle}</p>
                <div className="mt-2 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-full ${goal.completed ? 'bg-emerald-500' : 'bg-sky-500'}`} style={{ width: `${goal.progressPercent}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && (
        <div className="panel-card">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Faculty Leaderboard</h2>
              <p className="text-sm text-slate-500 mt-1">
                Optional visibility. Compare milestone momentum with other faculty.
              </p>
            </div>
            <button onClick={toggleLeaderboardVisibility} className="btn-secondary text-xs">
              {showLeaderboard ? 'Hide Leaderboard' : 'Show Leaderboard'}
            </button>
          </div>

          {!showLeaderboard ? (
            <p className="text-sm text-slate-500">Leaderboard is hidden. Use the button above to show it anytime.</p>
          ) : leaderboardLoading ? (
            <p className="text-sm text-slate-500">Loading leaderboard...</p>
          ) : (
            <div className="space-y-2">
              {(leaderboard.top || []).map((entry) => (
                <div key={`${entry.facultyId}-${entry.rank}`} className="rounded-xl border border-slate-200 px-3 py-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">#{entry.rank}</span>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{entry.name}</p>
                      <p className="text-xs text-slate-500">{entry.department}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{entry.points} pts</p>
                    <p className="text-xs text-slate-500">Level {entry.level} • {entry.earnedBadges} badges</p>
                  </div>
                </div>
              ))}

              {leaderboard.me && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 mt-3">
                  <p className="text-xs text-sky-700 font-medium">
                    Your rank: #{leaderboard.me.rank} • {leaderboard.me.points} pts • Level {leaderboard.me.level}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isAdmin && timeline.length > 0 && (
        <div className="panel-card">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Recent Achievement Activity</h2>
          <p className="text-sm text-slate-500 mb-4">Your latest learning and CIE execution events.</p>
          <div className="space-y-2">
            {timeline.map((event, idx) => (
              <div key={`${event.action}-${event.createdAt}-${idx}`} className="rounded-xl border border-slate-200 p-3">
                <p className="text-sm font-medium text-slate-900">{event.label}</p>
                {event.detail && <p className="text-xs text-slate-600 mt-1">{event.detail}</p>}
                <p className="text-xs text-slate-500 mt-1">{new Date(event.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isAdmin && activities.length === 0 && (
        <div className="panel-card-strong">
          <h2 className="text-lg font-semibold text-slate-900">Getting Started for New Faculty</h2>
          <p className="text-sm text-slate-600 mt-1 mb-4">
            Begin with one guided activity. Templates and rubrics are auto-applied to reduce setup time.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link to="/activities?create=1" className="btn-primary">Create First Activity</Link>
            <Link to="/learning" onClick={() => markGuideVisited('General')} className="btn-secondary">Browse Conduction Guides</Link>
          </div>
        </div>
      )}

      {/* Admin Stats */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard title="Faculty" value={stats.totalFaculty} icon={HiOutlineUserGroup} color="bg-blue-500" />
          <StatCard title="Subjects" value={stats.totalSubjects} icon={HiOutlineBookOpen} color="bg-green-500" />
          <StatCard title="Students" value={stats.totalStudents} icon={HiOutlineAcademicCap} color="bg-purple-500" />
          <StatCard title="Activities" value={stats.totalActivities} icon={HiOutlineClipboardList} color="bg-orange-500" />
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Subjects */}
        <div className="panel-card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            {isAdmin ? 'All Subjects' : 'My Subjects'}
          </h2>
          {subjects.length === 0 ? (
            <p className="text-slate-400 text-sm">No subjects found.</p>
          ) : (
            <div className="space-y-2">
              {subjects.map((s) => (
                <div
                  key={s._id}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.code} • {s.class?.name}</p>
                  </div>
                  <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                    {s.faculty?.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activities */}
        <div className="panel-card">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activities</h2>
          {activities.length === 0 ? (
            <p className="text-slate-400 text-sm">No activities yet.</p>
          ) : (
            <div className="space-y-2">
              {activities.map((a) => (
                <Link
                  key={a._id}
                  to={`/activities/${a._id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition border border-slate-200"
                >
                  <div>
                    <p className="font-medium text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.activityType} • {a.subject?.name}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      a.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-700'
                        : a.status === 'submitted'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {a.status}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Learning Center */}
        <div className="panel-card lg:col-span-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Learning Center</h2>
              <p className="text-sm text-slate-500 mt-1">
                Activity-wise conduction guides with timing and rubric mapping for faculty onboarding.
              </p>
            </div>
            <Link to="/learning" onClick={() => markGuideVisited('General')} className="btn-primary">Open Learning Center</Link>
          </div>
        </div>
      </div>

      {!isAdmin && (
        <Modal show={showOnboardingModal} onClose={closeOnboardingModal} title="Welcome to CIE Faculty Onboarding" wide>
          <p className="text-sm text-gray-600 mb-4">
            Your first week success path is simple: learn one playbook, create one activity, finalize rubrics, and open grading.
          </p>

          <ol className="space-y-2 mb-5">
            <li className="text-sm text-gray-700">1. Open one guide in Learning Center based on your activity type.</li>
            <li className="text-sm text-gray-700">2. Create your first CIE activity from templates.</li>
            <li className="text-sm text-gray-700">3. Submit or lock the activity after rubric review.</li>
            <li className="text-sm text-gray-700">4. Start grading from the scoring grid.</li>
          </ol>

          <div className="flex justify-end gap-3 flex-wrap">
            <button type="button" onClick={closeOnboardingModal} className="btn-secondary">
              Maybe Later
            </button>
            <Link
              to="/learning"
              onClick={() => {
                markGuideVisited('General');
                closeOnboardingModal();
              }}
              className="btn-secondary"
            >
              Open Learning Guide
            </Link>
            <Link to="/activities?create=1" onClick={closeOnboardingModal} className="btn-primary">
              Create First Activity
            </Link>
          </div>
        </Modal>
      )}
    </div>
  );
}
