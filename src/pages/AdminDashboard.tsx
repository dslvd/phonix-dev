import { motion } from 'framer-motion';
import Card from '../components/Card';
import Button from '../components/Button';
import { AppState, Page } from '../App';
import { usePremium } from '../lib/usePremium';

interface AdminDashboardProps {
  navigate: (page: Page) => void;
  appState: AppState;
  premium: ReturnType<typeof usePremium>;
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
  const wordsLearned = appState.learnedWords.length;
  const batteries = premium.isPremium ? 'Unlimited' : `${appState.batteriesRemaining} / 5`;
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
        </section>
      </div>
    </div>
  );
}