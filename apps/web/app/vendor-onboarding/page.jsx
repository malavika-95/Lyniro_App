'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader, ChevronRight, ArrowRight, Zap } from 'lucide-react';

const ONBOARDING_STEPS = [
  {
    id: 'profile',
    title: 'Complete Your Profile',
    description: 'Add your profile information and avatar',
    icon: '👤',
    action: 'Go to Settings',
    route: '/settings'
  },
  {
    id: 'company',
    title: 'Configure Workspace',
    description: 'Set company name, logo, and brand color',
    icon: '🏢',
    action: 'Customize Branding',
    route: '/settings'
  },
  {
    id: 'template',
    title: 'Create First Template',
    description: 'Build a reusable onboarding template',
    icon: '📋',
    action: 'Create Template',
    route: '/templates'
  },
  {
    id: 'team',
    title: 'Invite Team Members',
    description: 'Add your team to collaborate',
    icon: '👥',
    action: 'Manage Team',
    route: '/settings?tab=team'
  },
  {
    id: 'plan',
    title: 'Create First Customer Plan',
    description: 'Set up onboarding for your first customer',
    icon: '🎯',
    action: 'Create Plan',
    route: '/'
  }
];

export default function VendorOnboarding() {
  const router = useRouter();
  const [completedSteps, setCompletedSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load completed steps from localStorage
    const saved = localStorage.getItem('onboarding_steps');
    if (saved) {
      setCompletedSteps(JSON.parse(saved));
    }
    setLoading(false);
  }, []);

  const toggleStep = (stepId) => {
    const updated = completedSteps.includes(stepId)
      ? completedSteps.filter(id => id !== stepId)
      : [...completedSteps, stepId];
    setCompletedSteps(updated);
    localStorage.setItem('onboarding_steps', JSON.stringify(updated));
  };

  const handleStartAction = (route) => {
    router.push(route);
  };

  const completionPercentage = Math.round((completedSteps.length / ONBOARDING_STEPS.length) * 100);
  const allCompleted = completedSteps.length === ONBOARDING_STEPS.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6 shadow-sm">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Get Started</h1>
              <p className="text-gray-600">Complete these steps to set up your workspace and start managing customer onboarding.</p>
            </div>
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-2xl">O</div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900">{completedSteps.length} of {ONBOARDING_STEPS.length} steps completed</span>
              <span className="text-lg font-bold text-blue-600">{completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Success Message */}
        {allCompleted && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6 flex items-start gap-4">
            <CheckCircle2 size={24} className="text-green-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-green-900 mb-1">You're All Set!</h3>
              <p className="text-green-700 text-sm mb-4">Your workspace is ready. Start creating templates and managing customer onboarding.</p>
              <button
                onClick={() => router.push('/')}
                className="text-sm font-medium text-green-700 hover:text-green-800 flex items-center gap-1"
              >
                Go to Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Onboarding Steps */}
        <div className="space-y-4">
          {ONBOARDING_STEPS.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            return (
              <div
                key={step.id}
                className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition cursor-pointer"
                onClick={() => toggleStep(step.id)}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleStep(step.id);
                    }}
                    className="flex-shrink-0 mt-0.5 focus:outline-none"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={24} className="text-green-600" />
                    ) : (
                      <Circle size={24} className="text-gray-300" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xl">{step.icon}</span>
                          <h3 className={`font-semibold text-lg ${isCompleted ? 'text-gray-600' : 'text-gray-900'}`}>
                            {step.title}
                          </h3>
                        </div>
                        <p className="text-gray-600 text-sm">{step.description}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartAction(step.route);
                        }}
                        className={`px-4 py-2 font-medium rounded-lg transition flex items-center gap-1 flex-shrink-0 ${
                          isCompleted
                            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {step.action}
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tips Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
          <div className="flex gap-3">
            <Zap size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">💡 Pro Tips</h4>
              <ul className="space-y-1 text-sm text-blue-800">
                <li>• Create templates for different customer types to save time</li>
                <li>• Customize your brand color to match your company identity</li>
                <li>• Invite team members early so they can help manage customer onboarding</li>
                <li>• Use the analytics dashboard to track customer engagement</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push('/csm-login')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Go Back
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
          >
            Go to Dashboard
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
