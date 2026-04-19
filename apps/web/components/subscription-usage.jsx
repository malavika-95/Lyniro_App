'use client';

import React, { useState } from 'react';
import { AlertCircle, TrendingUp, Users, Zap, X } from 'lucide-react';

/**
 * SubscriptionUsagePanel - Shows current subscription usage
 * Displays limits and warnings
 */
export function SubscriptionUsagePanel({ stats, onUpgradeClick }) {
  if (!stats) return null;

  const planName = stats.currentPlan?.name || 'Free';
  
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Subscription</h3>
          <p className="text-sm text-gray-600 mt-1">{planName} Plan</p>
        </div>
        <button
          onClick={onUpgradeClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
        >
          Upgrade
        </button>
      </div>

      <div className="space-y-4">
        {/* Active Plans Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-gray-900">Active Plans</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {stats.plans.used} {stats.plans.limit ? `/ ${stats.plans.limit}` : '/ Unlimited'}
            </span>
          </div>
          {stats.plans.limit && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.plans.usagePercent >= 80 ? 'bg-red-600' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(stats.plans.usagePercent, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${stats.plans.usagePercent >= 80 ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.plans.usagePercent >= 80
                  ? `Warning: You're at ${stats.plans.usagePercent}% of your limit`
                  : `${stats.plans.usagePercent}% used`
                }
              </p>
            </>
          )}
        </div>

        {/* Users Usage */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-green-600" />
              <span className="text-sm font-medium text-gray-900">Team Members</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">
              {stats.users.used} {stats.users.limit ? `/ ${stats.users.limit}` : '/ Unlimited'}
            </span>
          </div>
          {stats.users.limit && (
            <>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.users.usagePercent >= 80 ? 'bg-red-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(stats.users.usagePercent, 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${stats.users.usagePercent >= 80 ? 'text-red-600' : 'text-gray-600'}`}>
                {stats.users.usagePercent >= 80
                  ? `Warning: You're at ${stats.users.usagePercent}% of your limit`
                  : `${stats.users.usagePercent}% used`
                }
              </p>
            </>
          )}
        </div>

        {/* API Usage */}
        {stats.currentPlan?.apiLimit > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-purple-600" />
                <span className="text-sm font-medium text-gray-900">API Requests</span>
              </div>
              <span className="text-sm font-semibold text-gray-900">
                {stats.apiCalls.used} {stats.apiCalls.limit ? `/ ${stats.apiCalls.limit}` : '/ Unlimited'}
              </span>
            </div>
            {stats.apiCalls.limit && (
              <>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      stats.apiCalls.usagePercent >= 80 ? 'bg-red-600' : 'bg-purple-600'
                    }`}
                    style={{ width: `${Math.min(stats.apiCalls.usagePercent, 100)}%` }}
                  />
                </div>
                <p className={`text-xs mt-1 ${stats.apiCalls.usagePercent >= 80 ? 'text-red-600' : 'text-gray-600'}`}>
                  {stats.apiCalls.usagePercent >= 80
                    ? `Warning: You're at ${stats.apiCalls.usagePercent}% of your monthly limit`
                    : `${stats.apiCalls.usagePercent}% used this month`
                  }
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * LimitReachedModal - Shows when user hits a limit
 */
export function LimitReachedModal({ type, limit, current, onUpgrade, onClose }) {
  const titleMap = {
    PLAN_LIMIT: 'Plan Limit Reached',
    USER_LIMIT: 'User Limit Reached',
    API_LIMIT: 'API Limit Reached'
  };

  const messageMap = {
    PLAN_LIMIT: `You've reached the maximum of ${limit} active plans. Upgrade your plan to create more.`,
    USER_LIMIT: `You've reached the maximum of ${limit} team members. Upgrade your plan to add more.`,
    API_LIMIT: `You've exceeded your monthly API limit of ${limit} requests. Your limit will reset next month, or upgrade for more.`
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="flex items-start gap-4 p-6 border-b border-gray-200">
          <AlertCircle size={24} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900">{titleMap[type]}</h2>
            <p className="text-sm text-gray-600 mt-2">{messageMap[type]}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-xs text-gray-600 uppercase font-semibold mb-1">Current Usage</p>
            <p className="text-2xl font-bold text-gray-900">
              {current} <span className="text-lg text-gray-600">/ {limit}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
            >
              Manage Usage
            </button>
            <button
              onClick={onUpgrade}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Upgrade Plan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * WarningBanner - Shows 80% usage warning
 */
export function UsageWarningBanner({ type, usagePercent, limit, onUpgradeClick }) {
  if (usagePercent < 80) return null;

  const messageMap = {
    plans: `You're using ${usagePercent}% of your active plans limit (${limit} max)`,
    users: `You're using ${usagePercent}% of your team members limit (${limit} max)`,
    api: `You're using ${usagePercent}% of your monthly API limit (${limit} max)`
  };

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-600 flex-shrink-0" />
        <p className="text-sm font-medium text-yellow-900">{messageMap[type]}</p>
      </div>
      <button
        onClick={onUpgradeClick}
        className="text-sm font-medium text-yellow-700 hover:text-yellow-900 px-3 py-1 rounded hover:bg-yellow-100 transition"
      >
        Upgrade
      </button>
    </div>
  );
}

/**
 * FeatureLockedBadge - Shows on locked features
 */
export function FeatureLockedBadge({ planRequired }) {
  return (
    <div className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
      <X size={12} />
      {planRequired || 'Premium'}
    </div>
  );
}

/**
 * PlanComparisonTable - Shows all plans and features
 */
export function PlanComparisonTable({ currentPlan, onSelectPlan }) {
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      features: {
        'Active Plans': '3',
        'Team Members': '1',
        'Chat': '❌',
        'Notes': '❌',
        'Analytics': '❌',
        'API': '❌'
      }
    },
    {
      id: 'starter',
      name: 'Starter',
      price: 79,
      features: {
        'Active Plans': '10',
        'Team Members': '3',
        'Chat': '✓',
        'Notes': '✓',
        'Analytics': '❌',
        'API': '❌'
      }
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 199,
      features: {
        'Active Plans': '50',
        'Team Members': '10',
        'Chat': '✓',
        'Notes': '✓',
        'Analytics': '✓',
        'API': '10K/mo'
      }
    },
    {
      id: 'scale',
      name: 'Scale',
      price: 399,
      features: {
        'Active Plans': 'Unlimited',
        'Team Members': 'Unlimited',
        'Chat': '✓',
        'Notes': '✓',
        'Analytics': '✓',
        'API': '100K/mo'
      }
    }
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={`rounded-lg border-2 p-6 transition ${
            currentPlan === plan.id
              ? 'border-blue-600 bg-blue-50'
              : 'border-gray-200 bg-white hover:border-gray-300'
          }`}
        >
          <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">${plan.price}</p>
          <p className="text-sm text-gray-600">/month</p>

          {currentPlan !== plan.id && (
            <button
              onClick={() => onSelectPlan(plan.id)}
              className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
            >
              Select Plan
            </button>
          )}

          {currentPlan === plan.id && (
            <div className="w-full mt-4 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-center text-sm font-medium">
              Current Plan
            </div>
          )}

          <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
            {Object.entries(plan.features).map(([feature, value]) => (
              <div key={feature} className="flex items-center justify-between">
                <span className="text-sm text-gray-700">{feature}</span>
                <span className="text-sm font-medium text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
