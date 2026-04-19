'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronRight, AlertCircle, Archive2 } from 'lucide-react';

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const response = await res.json();
        const plansData = response.data || response || [];
        setPlans(Array.isArray(plansData) ? plansData : []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load plans:', error);
      setLoading(false);
    }
  };

  const getCompletionPercentage = (plan) => {
    if (!plan.tasks || plan.tasks.length === 0) return 0;
    const completed = plan.tasks.filter(t => t.status === 'complete').length;
    return Math.round((completed / plan.tasks.length) * 100);
  };

  const getRiskLevel = (plan) => {
    const completion = getCompletionPercentage(plan);
    const blockedCount = plan.tasks?.filter(t => t.status === 'blocked').length || 0;
    const isOverdue = plan.go_live_date && new Date(plan.go_live_date) < new Date();

    if (completion === 100) {
      return { level: 'Complete', color: 'bg-green-100', textColor: 'text-green-700', icon: '✓' };
    } else if (completion < 30 || blockedCount >= 3 || isOverdue) {
      return { level: 'Critical', color: 'bg-red-100', textColor: 'text-red-700', icon: '!' };
    } else if (completion < 50 || blockedCount >= 1) {
      return { level: 'Warning', color: 'bg-orange-100', textColor: 'text-orange-700', icon: '⚠' };
    } else {
      return { level: 'On Track', color: 'bg-blue-100', textColor: 'text-blue-700', icon: '→' };
    }
  };

  const filteredPlans = plans.filter(plan => {
    const completion = getCompletionPercentage(plan);
    const matchesSearch = 
      plan.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.customer_email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'all') return true;
    if (filterStatus === 'active') return completion < 100;
    if (filterStatus === 'completed') return completion === 100;
    if (filterStatus === 'at-risk') {
      const risk = getRiskLevel(plan);
      return risk.level === 'Critical' || risk.level === 'Warning';
    }

    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-white rounded-lg border border-gray-200"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Plans</h1>
              <p className="text-gray-600 mt-2">Manage all customer onboarding plans</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm flex items-center gap-2"
            >
              <Plus size={18} />
              New Plan
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-sm font-medium">Total Plans</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{plans.length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-sm font-medium">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{plans.filter(p => getCompletionPercentage(p) < 100).length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-sm font-medium">Completed</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{plans.filter(p => getCompletionPercentage(p) === 100).length}</p>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-gray-500 text-sm font-medium">At Risk</p>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {plans.filter(p => {
                  const risk = getRiskLevel(p);
                  return risk.level === 'Critical' || risk.level === 'Warning';
                }).length}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-4 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, company, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div className="flex gap-2">
            {[
              { value: 'all', label: 'All Plans' },
              { value: 'active', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'at-risk', label: 'At Risk' }
            ].map(filter => (
              <button
                key={filter.value}
                onClick={() => setFilterStatus(filter.value)}
                className={`px-4 py-2 rounded-lg transition text-sm font-medium ${
                  filterStatus === filter.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Plans List */}
        {filteredPlans.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <Archive2 size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium mb-2">No plans found</p>
            <p className="text-gray-500 text-sm mb-6">
              {searchQuery ? 'Try adjusting your search' : 'Create a new plan to get started'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
              >
                Create New Plan
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPlans.map(plan => {
              const completion = getCompletionPercentage(plan);
              const risk = getRiskLevel(plan);
              const blockedCount = plan.tasks?.filter(t => t.status === 'blocked').length || 0;

              return (
                <div
                  key={plan.id}
                  onClick={() => router.push(`/plans/${plan.id}`)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:border-gray-300 hover:shadow-md transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {/* Top Row: Customer & Company */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition">{plan.customer_name}</h3>
                          <p className="text-sm text-gray-600">{plan.company_name}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${risk.color} ${risk.textColor}`}>
                          {risk.level}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                completion === 100 ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${completion}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 min-w-fit">{completion}%</span>
                      </div>

                      {/* Meta Info */}
                      <div className="flex items-center gap-4 text-xs text-gray-600">
                        <span>📧 {plan.customer_email}</span>
                        <span>📝 {plan.tasks?.length || 0} tasks</span>
                        {blockedCount > 0 && (
                          <span className="flex items-center gap-1 text-red-600 font-medium">
                            <AlertCircle size={14} />
                            {blockedCount} blocked
                          </span>
                        )}
                        <span>📅 {new Date(plan.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Arrow Icon */}
                    <ChevronRight size={20} className="text-gray-400 group-hover:text-gray-600 transition ml-4 flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
