import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Card from '../components/Card';
import Button from '../components/Button';
import { AppState, Page } from '../App';
import { usePremium } from '../lib/usePremium';
import { BATTERY_MAX, formatBatteryCountdown } from '../lib/battery';

interface AdminDashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
  premium: ReturnType<typeof usePremium>;
}

interface AdminUserRecord {
  userKey: string;
  displayName: string;
  totalXP: number;
  stars: number;
  learnedWords: number;
  currentStreak: number;
  updatedAt: string;
}

function getAdminIdentity() {
  if (typeof window === 'undefined') {
    return { name: 'Admin', email: 'Not available' };
  }

  const raw = window.localStorage.getItem('user');
  if (!raw) {
    return { name: 'Admin', email: 'Not available' };
  }

  try {
    const user = JSON.parse(raw) as { name?: string; email?: string };
    return {
      name: (user.name || 'Admin').trim() || 'Admin',
      email: (user.email || 'Not available').trim() || 'Not available',
    };
  } catch {
    return { name: 'Admin', email: 'Not available' };
  }
}

export default function AdminDashboard({ navigate, appState, premium }: AdminDashboardProps) {
  const admin = getAdminIdentity();
  const [adminPassword, setAdminPassword] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.sessionStorage.getItem('phonix-admin-password') || '';
  });
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [deleteError, setDeleteError] = useState('');
  const [activeUserActionKey, setActiveUserActionKey] = useState<string | null>(null);
  const wordsLearned = appState.learnedWords.length;
  const batteries = premium.isPremium
    ? 'Unlimited'
    : appState.batteryResetAt
    ? `${appState.batteriesRemaining} / ${BATTERY_MAX} · ${formatBatteryCountdown(appState.batteryResetAt)}`
    : `${appState.batteriesRemaining} / ${BATTERY_MAX}`;
  const activityScore = Math.min(
    100,
    Math.round((appState.totalXP / 1500) * 100 + appState.currentStreak * 2 + wordsLearned * 0.8)
  );

  const topMetrics = [
    { label: 'Total XP', value: `${appState.totalXP}`, hint: 'Learning effort' },
    { label: 'Words Learned', value: `${wordsLearned}`, hint: 'Vocabulary growth' },
    { label: 'Current Streak', value: `${appState.currentStreak} day${appState.currentStreak === 1 ? '' : 's'}`, hint: 'Consistency' },
    { label: 'Quiz Stars', value: `${appState.stars}`, hint: 'Quiz performance' },
  ];

  useEffect(() => {
    if (!adminPassword) {
      return;
    }

    let cancelled = false;

    const loadUsers = async () => {
      setIsLoadingUsers(true);
      setAuthError('');

      try {
        const response = await fetch('/api/admin-users', {
          headers: {
            'x-admin-password': adminPassword,
          },
        });

        if (response.status === 401) {
          throw new Error('unauthorized');
        }

        if (!response.ok) {
          throw new Error('failed-to-load-users');
        }

        const data = await response.json();
        if (!cancelled) {
          setUsers(Array.isArray(data?.users) ? data.users : []);
          setIsAuthenticated(true);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUsers([]);
          setAdminPassword('');
          if (typeof window !== 'undefined') {
            window.sessionStorage.removeItem('phonix-admin-password');
          }
        }
      } finally {
        if (!cancelled) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, [adminPassword]);

  const handleAdminLogin = async () => {
    const password = passwordInput.trim();
    if (!password) {
      setAuthError('Enter the admin password.');
      return;
    }

    setIsLoadingUsers(true);
    setAuthError('');

    try {
      const response = await fetch('/api/admin-users', {
        headers: {
          'x-admin-password': password,
        },
      });

      if (!response.ok) {
        throw new Error('unauthorized');
      }

      const data = await response.json();
      setAdminPassword(password);
      setUsers(Array.isArray(data?.users) ? data.users : []);
      setIsAuthenticated(true);
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('phonix-admin-password', password);
      }
    } catch {
      setAuthError('Wrong admin password.');
      setIsAuthenticated(false);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleDeleteUser = async (userKey: string) => {
    const confirmDelete = window.confirm(`Delete ${userKey}? This removes the account data from the leaderboard.`);
    if (!confirmDelete) {
      return;
    }

    setDeleteError('');
    setActiveUserActionKey(`delete:${userKey}`);

    try {
      const response = await fetch('/api/admin-users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ userKey }),
      });

      if (!response.ok) {
        throw new Error('delete-failed');
      }

      setUsers((current) => current.filter((user) => user.userKey !== userKey));
    } catch {
      setDeleteError('Failed to delete user.');
    } finally {
      setActiveUserActionKey(null);
    }
  };

  const handleResetUserHistory = async (userKey: string) => {
    const confirmReset = window.confirm(
      `Reset all learning history for ${userKey}? This keeps the account but clears progress, XP, stars, and backpack data.`
    );
    if (!confirmReset) {
      return;
    }

    setDeleteError('');
    setActiveUserActionKey(`reset:${userKey}`);

    try {
      const response = await fetch('/api/admin-users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ userKey }),
      });

      if (!response.ok) {
        throw new Error('reset-failed');
      }

      setUsers((current) =>
        current.map((user) =>
          user.userKey === userKey
            ? {
                ...user,
                totalXP: 0,
                stars: 0,
                learnedWords: 0,
                currentStreak: 1,
                updatedAt: new Date().toISOString(),
              }
            : user
        )
      );
    } catch {
      setDeleteError('Failed to reset user history.');
    } finally {
      setActiveUserActionKey(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="theme-page min-h-screen p-6 text-slate-100 lg:p-8">
        <div className="mx-auto max-w-md rounded-3xl border p-6 theme-surface">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FAC775]">Admin Access</p>
          <h1 className="theme-title mt-2 font-baloo text-4xl font-bold">Enter password</h1>
          <p className="theme-muted mt-2 text-sm font-semibold">Protected admin area for Phonix page management.</p>
          <div className="mt-5 space-y-3">
            <input
              type="password"
              value={passwordInput}
              onChange={(event) => setPasswordInput(event.target.value)}
              placeholder="Admin password"
              className="theme-surface-soft w-full rounded-2xl border px-4 py-3 font-semibold outline-none focus:border-[#56b8e8]"
            />
            {authError && <p className="text-sm font-semibold text-red-400">{authError}</p>}
            <button
              onClick={handleAdminLogin}
              disabled={isLoadingUsers}
              className="w-full rounded-2xl bg-gradient-to-r from-primary to-secondary px-6 py-4 font-bold text-white shadow-lg disabled:opacity-60"
            >
              {isLoadingUsers ? 'Checking...' : 'Unlock Admin'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="theme-page min-h-screen p-6 text-slate-100 lg:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <motion.section
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="theme-surface rounded-3xl border p-6"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#FAC775]">Admin Dashboard</p>
              <h1 className="theme-title mt-1 font-baloo text-4xl font-bold">Platform Control Center</h1>
              <p className="theme-muted mt-2 text-sm font-semibold">
                Manage user learning health, monitor progress metrics, and jump into key workflows.
              </p>
            </div>

            <div className="theme-surface-soft rounded-2xl border px-4 py-3">
              <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">Logged in as</p>
              <p className="theme-title mt-1 text-sm font-bold">{admin.name}</p>
              <p className="theme-muted text-xs">{admin.email}</p>
            </div>
          </div>
        </motion.section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {topMetrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * index }}
            >
              <Card hover={false} className="h-full rounded-2xl border p-4">
                <p className="theme-muted text-xs font-bold uppercase tracking-[0.12em]">{metric.label}</p>
                <p className="theme-title mt-2 font-baloo text-4xl font-bold">{metric.value}</p>
                <p className="theme-muted mt-1 text-xs font-semibold">{metric.hint}</p>
              </Card>
            </motion.div>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <Card hover={false} className="rounded-2xl border p-5">
            <h2 className="theme-title font-baloo text-3xl font-bold">System Status</h2>
            <div className="mt-4 space-y-3">
              <div className="theme-surface-soft flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="theme-muted text-sm font-semibold">Cloud Sync</span>
                <span className="rounded-full border border-[#2f9de4] bg-[#12364b] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#9fdbff]">Online</span>
              </div>
              <div className="theme-surface-soft flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="theme-muted text-sm font-semibold">Premium Access</span>
                <span className="rounded-full border border-[#FF9126] bg-[#4c2d09] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#ffc484]">
                  {premium.loading ? 'Checking' : premium.isPremium ? 'Active' : 'Free'}
                </span>
              </div>
              <div className="theme-surface-soft flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="theme-muted text-sm font-semibold">Batteries</span>
                <span className="theme-title text-sm font-bold">{batteries}</span>
              </div>
              <div className="theme-surface-soft flex items-center justify-between rounded-xl border px-3 py-2">
                <span className="theme-muted text-sm font-semibold">Engagement Score</span>
                <span className="theme-title text-sm font-bold">{activityScore}%</span>
              </div>
            </div>
          </Card>

          <Card hover={false} className="rounded-2xl border p-5">
            <h2 className="theme-title font-baloo text-3xl font-bold">Quick Actions</h2>
            <p className="theme-muted mt-1 text-sm font-semibold">Open core areas to review product behavior fast.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Button variant="primary" onClick={() => navigate('dashboard')} icon="🏠" className="w-full">
                Main Dashboard
              </Button>
              <Button variant="outline" onClick={() => navigate('scan')} icon="📸" className="w-full">
                Scan Mode
              </Button>
              <Button variant="outline" onClick={() => navigate('collection')} icon="🎒" className="w-full">
                Backpack
              </Button>
              <Button variant="outline" onClick={() => navigate('profile')} icon="👤" className="w-full">
                Profile
              </Button>
            </div>
          </Card>

          <Card hover={false} className="rounded-2xl border p-5">
            <h2 className="theme-title font-baloo text-3xl font-bold">User Accounts</h2>
            <p className="theme-muted mt-1 text-sm font-semibold">Reset user history or delete synced accounts from Cloudflare D1.</p>
            {deleteError && <p className="mt-2 text-sm font-semibold text-red-400">{deleteError}</p>}
            <div className="mt-4 max-h-[24rem] space-y-3 overflow-y-auto pr-1">
              {users.length === 0 ? (
                <p className="theme-muted text-sm font-semibold">
                  {isLoadingUsers ? 'Loading users...' : 'No synced users found.'}
                </p>
              ) : (
                users.map((user) => (
                  <div key={user.userKey} className="theme-surface-soft flex items-center justify-between gap-3 rounded-xl border px-3 py-3">
                    <div className="min-w-0">
                      <p className="theme-title truncate text-sm font-bold">{user.displayName}</p>
                      <p className="theme-muted truncate text-xs font-semibold">{user.userKey}</p>
                      <p className="theme-muted text-xs font-semibold">
                        {user.learnedWords} words • {user.stars} stars • XP {user.totalXP}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleResetUserHistory(user.userKey)}
                        disabled={activeUserActionKey !== null}
                        className="rounded-xl border border-amber-400 px-3 py-2 text-xs font-bold text-amber-300 transition hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeUserActionKey === `reset:${user.userKey}` ? 'Resetting...' : 'Reset History'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.userKey)}
                        disabled={activeUserActionKey !== null}
                        className="rounded-xl border border-red-400 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {activeUserActionKey === `delete:${user.userKey}` ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </section>
      </div>
    </div>
  );
}
