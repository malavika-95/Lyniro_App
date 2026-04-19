'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, Users, Package, ShoppingCart, Zap, LogOut, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [sessionError, setSessionError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      console.log('[ADMIN] Loading admin dashboard...');
      const [statsRes, profileRes] = await Promise.all([
        fetch('/api/lyniro-admin/stats'),
        fetch('/api/lyniro-admin/profile')
      ]);

      console.log('[ADMIN] Stats response status:', statsRes.status);
      if (statsRes.ok) {
        const data = await statsRes.json();
        console.log('[ADMIN] Stats data:', data);
        if (data.success) {
          setStats(data.stats);
        }
      } else {
        const errorText = await statsRes.text();
        console.error('[ADMIN] Stats error response:', errorText);
        setSessionError(`Stats error: ${statsRes.status}`);
      }

      console.log('[ADMIN] Profile response status:', profileRes.status);
      if (profileRes.ok) {
        const data = await profileRes.json();
        console.log('[ADMIN] Profile data:', data);
        setProfile(data);
      } else {
        const errorText = await profileRes.text();
        console.error('[ADMIN] Profile error response:', errorText);
        setSessionError(`Profile error: ${profileRes.status}`);
      }
    } catch (error) {
      console.error('[ADMIN] Error loading dashboard:', error);
      setSessionError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/lyniro-admin/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.push('/lyniro-admin-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-900 font-bold mb-2">Session Error</h2>
          <p className="text-red-800">{sessionError}</p>
          <button 
            onClick={() => router.push('/lyniro-admin/login')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => {
    return (
      <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">{label}</p>
            <p className="text-5xl font-bold text-gray-900 mt-4">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          </div>
          <Icon size={40} className="text-gray-300" />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
            <span className="text-lg font-bold text-gray-900">Lyniro Admin</span>
          </div>

          <nav className="flex gap-8">
            <button className="font-medium text-gray-900">Dashboard</button>
          </nav>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{profile?.first_name}</p>
              <p className="text-xs text-gray-600">{profile?.role || 'Admin'}</p>
            </div>

            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {(profile?.first_name?.[0] || 'A').toUpperCase()}{(profile?.last_name?.[0] || '').toUpperCase()}
            </div>

            <button 
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900 transition p-2"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 mb-12">
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Platform overview and key metrics</p>
          </div>

          {!stats ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center shadow-sm">
              <p className="text-gray-600">Failed to load dashboard data</p>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-6 mb-8">
                <StatCard
                  icon={Building2}
                  label="Total Vendors"
                  value={stats.total_vendors}
                />
                <StatCard
                  icon={Users}
                  label="Total Users"
                  value={stats.total_users}
                />
                <StatCard
                  icon={Package}
                  label="Total Plans"
                  value={stats.total_plans}
                />
                <StatCard
                  icon={ShoppingCart}
                  label="Total Clients"
                  value={stats.total_clients}
                />
                <StatCard
                  icon={TrendingUp}
                  label="New This Week"
                  value={stats.new_vendors_this_week}
                />
                <StatCard
                  icon={Zap}
                  label="Active Plans"
                  value={stats.active_plans}
                />
              </div>

              {/* Plans by Tier */}
              <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Plans by Tier</h2>
                <div className="space-y-4">
                  {stats.plans_by_tier && stats.plans_by_tier.map((tier) => {
                    const tierColors = {
                      'free': 'bg-gray-300',
                      'starter': 'bg-blue-400',
                      'growth': 'bg-purple-400',
                      'scale': 'bg-amber-400'
                    };
                    const barColor = tierColors[tier.tier] || 'bg-gray-300';
                    const maxCount = Math.max(...stats.plans_by_tier.map(t => t.count));
                    const percentage = (tier.count / maxCount) * 100;

                    return (
                      <div key={tier.tier}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium text-gray-900 capitalize">{tier.tier}</span>
                          <span className="text-gray-600 text-sm">{tier.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`${barColor} h-2 rounded-full transition`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent Signups */}
              <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Recent Signups</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-200">
                      <tr className="text-left text-gray-600">
                        <th className="pb-4 font-semibold">Company</th>
                        <th className="pb-4 font-semibold">Owner Email</th>
                        <th className="pb-4 font-semibold">Tier</th>
                        <th className="pb-4 font-semibold">Plans</th>
                        <th className="pb-4 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.recent_signups && stats.recent_signups.map((signup, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="py-4 font-medium text-gray-900">{signup.company_name}</td>
                          <td className="py-4 text-gray-600">{signup.owner_email}</td>
                          <td className="py-4">
                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium capitalize">
                              {signup.tier || 'free'}
                            </span>
                          </td>
                          <td className="py-4 text-gray-900">{signup.plan_count}</td>
                          <td className="py-4 text-gray-600">
                            {new Date(signup.date_joined).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
