'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getCurrentUser } from '@/lib/session-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, LogOut, X, Plus } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonatedUser, setImpersonatedUser] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.push('/auth/signin');
          return;
        }

        setUser(currentUser);
        setIsImpersonating(currentUser.impersonated_by_id ? true : false);

        const res = await fetch('/api/plans');
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || 'Failed to load plans');
        }
        const result = await res.json();

        if (result.success && result.data) {
          setPlans(result.data);
        } else if (Array.isArray(result)) {
          setPlans(result);
        } else {
          setPlans([]);
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/auth/signin');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleEndImpersonation = async () => {
    try {
      const res = await fetch('/api/auth/impersonate', { method: 'DELETE' });
      if (res.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Failed to end impersonation:', err);
    }
  };

  // Calculate stats
  const activePlans = plans.length;
  const completionRate = plans.length > 0
    ? Math.round(
        (plans.reduce((sum, plan) => sum + (plan.completion_rate || 0), 0) / plans.length) * 100
      )
    : 0;
  const totalCustomers = plans.length;
  const blockedCount = plans.reduce((sum, plan) => sum + (plan.blocked_count || 0), 0);

  const getStatusColor = (status) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'MEMBER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Loading skeleton */}
          <div className="space-y-6">
            <div className="h-12 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Impersonation Banner */}
      {isImpersonating && (
        <div className="bg-yellow-50 border border-yellow-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">
                Impersonating as <strong>{user.first_name}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleEndImpersonation}
              className="text-yellow-800 border-yellow-300 hover:bg-yellow-100"
            >
              End Impersonation
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{user.first_name}</p>
              <Badge className={`mt-1 ${getRoleColor(user.role)}`}>
                {user.role}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.first_name}!
          </h2>
          <p className="text-gray-600 mt-2">
            {activePlans === 0
              ? 'You have no active plans yet. Create your first plan to get started.'
              : `You have ${activePlans} active onboarding plan${activePlans !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900">Error</p>
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Active Plans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{activePlans}</div>
              <p className="text-xs text-gray-500 mt-2">Onboarding plans in progress</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{completionRate}%</div>
              <p className="text-xs text-gray-500 mt-2">Overall progress across plans</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-gray-900">{totalCustomers}</div>
              <p className="text-xs text-gray-500 mt-2">Active customer onboardings</p>
            </CardContent>
          </Card>
        </div>

        {/* New Plan Button */}
        <div className="mb-8">
          <Link href="/plans/new">
            <Button size="lg" className="gap-2 bg-blue-600 hover:bg-blue-700">
              <Plus className="h-5 w-5" />
              New Onboarding Plan
            </Button>
          </Link>
        </div>

        {/* Plans Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-6">Recent Plans</h3>

          {plans.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-600">No plans yet. Create your first onboarding plan to get started.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => {
                const progress = Math.round((plan.completion_rate || 0) * 100);
                return (
                  <Card key={plan.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-1">
                            {plan.customer_name}
                          </CardTitle>
                          <CardDescription className="line-clamp-1">
                            {plan.company_name}
                          </CardDescription>
                        </div>
                        <Badge className={`ml-2 flex-shrink-0 ${getStatusColor(plan.status || 'not_started')}`}>
                          {plan.status ? plan.status.replace('_', ' ') : 'Not Started'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-gray-600">Progress</span>
                          <span className="text-xs font-bold text-gray-900">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {/* Task Info */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <p className="text-gray-600">Total Tasks</p>
                          <p className="font-bold text-gray-900">{plan.task_count || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Blocked</p>
                          <p className="font-bold text-gray-900">{plan.blocked_count || 0}</p>
                        </div>
                      </div>

                      {/* View Link */}
                      <Link href={`/plans/${plan.id}`}>
                        <Button variant="outline" className="w-full mt-4">
                          View Plan
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
