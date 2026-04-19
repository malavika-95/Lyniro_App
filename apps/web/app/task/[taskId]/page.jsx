'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, AlertCircle, Loader } from 'lucide-react';
import { Suspense } from 'react';

function TaskMagicLinkContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = parseInt(searchParams.get('plan') || 0);
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [task, setTask] = useState(null);
  const [plan, setPlan] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    validateAndLoadTask();
  }, [planId, token]);

  const validateAndLoadTask = async () => {
    try {
      if (!planId || !token) {
        setError('Invalid magic link. Please check the URL and try again.');
        setLoading(false);
        return;
      }

      // Validate token and get task details
      const validateRes = await fetch(`/api/task-tokens/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, token })
      });

      if (!validateRes.ok) {
        const errorData = await validateRes.json().catch(() => ({}));
        setError(errorData.error || 'Invalid or expired magic link');
        setLoading(false);
        return;
      }

      const tokenData = await validateRes.json();
      const validTaskId = tokenData.taskId;

      // Get plan details
      const [planRes, companyRes] = await Promise.all([
        fetch(`/api/plans/${planId}`),
        fetch('/api/settings/company')
      ]);

      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData);
        
        // Find the task in the plan
        const foundTask = planData.tasks?.find(t => t.task_id === validTaskId);
        if (foundTask) {
          setTask(foundTask);
        }
      }

      if (companyRes.ok) {
        const settings = await companyRes.json();
        setCompanySettings(settings);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleCompleteTask = async () => {
    if (!task || !plan) return;

    setCompleting(true);
    try {
      const res = await fetch(`/api/plans/${planId}/tasks/${task.task_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'complete',
          token // Pass token for validation
        })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to complete task');
      }

      // Mark token as used
      await fetch(`/api/task-tokens/mark-used`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, taskId: task.task_id, token })
      }).catch(err => console.error('Error marking token used:', err));

      setCompleted(true);
      setTimeout(() => {
        router.push('/customer-login');
      }, 2000);
    } catch (error) {
      console.error('Error completing task:', error);
      setError(error.message || 'Failed to complete task');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Validating your link...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Invalid or Expired</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/customer-login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Complete! 🎉</h1>
          <p className="text-gray-600">Redirecting you to login...</p>
        </div>
      </div>
    );
  }

  if (!task || !plan) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Task not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Header with branding */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          {companySettings?.company_logo_url ? (
            <img src={companySettings.company_logo_url} alt="Company" className="h-8 w-auto" />
          ) : (
            <div 
              className="w-8 h-8 rounded flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: companySettings?.brand_color || '#2563eb' }}
            >
              {companySettings?.company_name?.[0] || 'O'}
            </div>
          )}
          <span className="font-semibold text-gray-900">{companySettings?.company_name || 'Onboarding'}</span>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Email Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8 text-center">
          <p className="text-blue-900 font-medium">
            You have one step to complete before going live
          </p>
        </div>

        {/* Task Card */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-blue-600 text-white p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-xl font-bold">✓</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold mb-2">{task.title}</h1>
                <p className="text-blue-100">{plan.company_name}</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Task Description */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Task Details</h2>
              <p className="text-gray-700 text-lg leading-relaxed">{task.description}</p>
            </div>

            {/* Progress */}
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-2">Almost there!</p>
                <div className="flex items-center justify-center gap-2">
                  <div className="flex-1 h-2 bg-green-200 rounded-full"></div>
                  <Check size={20} className="text-green-600" />
                </div>
              </div>
            </div>

            {/* Action */}
            <button
              onClick={handleCompleteTask}
              disabled={completing}
              className="w-full py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {completing ? (
                <>
                  <Loader size={20} className="animate-spin" />
                  Completing...
                </>
              ) : (
                'Complete This Step'
              )}
            </button>

            {/* Help Text */}
            <p className="text-center text-gray-600 text-sm mt-6">
              Can't complete this right now? You can also log in to your account to finish this task later.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TaskPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><p>Loading...</p></div>}>
      <TaskMagicLinkContent />
    </Suspense>
  );
}
