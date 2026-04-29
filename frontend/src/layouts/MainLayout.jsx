// ==========================================
// MainLayout — Sidebar + Content area
// ==========================================

import { useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HiOutlineHome,
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineBookOpen,
  HiOutlineClipboardList,
  HiOutlineLogout,
  HiOutlineSparkles,
  HiOutlineTemplate,
  HiOutlineUsers,
  HiOutlineCollection,
  HiOutlinePlusCircle,
  HiOutlineCalendar,
  HiMenu,
  HiX,
} from 'react-icons/hi';

const navItemClass = ({ isActive }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
    isActive
      ? 'bg-white text-slate-900 shadow-md'
      : 'text-slate-200 hover:bg-white/20 hover:text-white'
  }`;

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  const todayLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleDateString(undefined, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const primaryNavigation = isAdmin
    ? [
      { to: '/', label: 'Dashboard', Icon: HiOutlineHome },
      { to: '/academic-years', label: 'Academic Years', Icon: HiOutlineAcademicCap },
      { to: '/classes', label: 'Classes', Icon: HiOutlineCollection },
      { to: '/users', label: 'Users', Icon: HiOutlineUsers },
      { to: '/templates', label: 'Templates', Icon: HiOutlineTemplate },
      { to: '/learning', label: 'Learning Center', Icon: HiOutlineBookOpen },
    ]
    : [
      { to: '/', label: 'Dashboard', Icon: HiOutlineHome },
      { to: '/activities', label: 'Activities', Icon: HiOutlineClipboardList },
      { to: '/learning', label: 'Learning Center', Icon: HiOutlineBookOpen },
      { to: '/ai-tools', label: 'AI Tools', Icon: HiOutlineSparkles },
    ];

  const secondaryNavigation = isAdmin
    ? [
      { to: '/students', label: 'Students', Icon: HiOutlineUserGroup },
      { to: '/activities', label: 'Activities', Icon: HiOutlineClipboardList },
    ]
    : [];

  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-28 -left-20 h-80 w-80 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute top-8 right-0 h-72 w-72 rounded-full bg-cyan-200/60 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-indigo-100/70 blur-3xl" />
      </div>

      {!isMobileNavOpen ? null : (
        <button
          type="button"
          onClick={closeMobileNav}
          className="fixed inset-0 z-30 bg-slate-900/35 lg:hidden"
          aria-label="Close navigation"
        />
      )}

      <aside className={`fixed inset-y-0 left-0 z-40 flex h-full w-72 transform flex-col bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-4 shadow-2xl transition-transform duration-200 lg:translate-x-0 ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-sky-200/80">PICT</p>
            <h1 className="mt-1 text-lg font-semibold text-white">CIE Platform</h1>
            <p className="mt-1 text-xs text-slate-300">Learning Workspace</p>
          </div>
          <button
            type="button"
            onClick={closeMobileNav}
            className="rounded-lg p-1.5 text-slate-200 hover:bg-white/20 lg:hidden"
            aria-label="Close navigation"
          >
            <HiX className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="mb-4 rounded-2xl border border-white/15 bg-white/10 p-3 text-slate-100">
            <div className="text-xs uppercase tracking-wide text-sky-100/90">Current Role</div>
            <div className="mt-1 text-sm font-medium capitalize">{user?.role || 'faculty'}</div>
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-300">
              <HiOutlineCalendar className="h-4 w-4" />
              {todayLabel}
            </div>
          </div>

          <nav className="space-y-1">
            <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.2em] text-slate-400">Workspace</p>
            {primaryNavigation.map(({ to, label, Icon }) => (
              <NavLink key={to} to={to} end={to === '/'} className={navItemClass} onClick={closeMobileNav}>
                <Icon className="h-5 w-5" /> {label}
              </NavLink>
            ))}

            {secondaryNavigation.length > 0 && (
              <>
                <p className="px-2 pb-1 pt-4 text-[11px] uppercase tracking-[0.2em] text-slate-400">Operations</p>
                {secondaryNavigation.map(({ to, label, Icon }) => (
                  <NavLink key={to} to={to} className={navItemClass} onClick={closeMobileNav}>
                    <Icon className="h-5 w-5" /> {label}
                  </NavLink>
                ))}
              </>
            )}
          </nav>

          <div className="mt-3 rounded-2xl border border-white/15 bg-white/10 p-3 text-slate-100">
            <p className="text-xs text-slate-300">Quick Action</p>
            <NavLink to="/activities?create=1" className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-100" onClick={closeMobileNav}>
              <HiOutlinePlusCircle className="h-5 w-5" /> Create Activity
            </NavLink>
          </div>
        </div>

        <div className="mt-3 border-t border-white/15 pt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-400 text-sm font-bold text-slate-900">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-white">{user?.name}</p>
              <p className="text-xs capitalize text-slate-300">{user?.role}</p>
            </div>
            <button onClick={handleLogout} className="rounded-lg p-2 text-slate-300 transition-colors hover:bg-white/15 hover:text-white" aria-label="Logout">
              <HiOutlineLogout className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="relative z-10 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-white/60 bg-white/80 backdrop-blur">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 shadow-sm hover:bg-slate-50 lg:hidden"
                aria-label="Open navigation"
              >
                <HiMenu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-semibold text-slate-900">Faculty Control Panel</p>
                <p className="text-xs text-slate-500">Conduction, grading, and insights in one place</p>
              </div>
            </div>
            <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 sm:flex">
              <HiOutlineCalendar className="h-4 w-4" />
              {todayLabel}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6">
          <div className="mx-auto max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
