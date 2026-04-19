'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

const TIERS = [
  {
    name: 'Free',
    price: '$0',
    period: 'Forever free',
    plans: 3,
    description: 'Perfect for getting started',
    features: [
      '3 active plans',
      'Core onboarding features',
      'Customer messaging',
      'Basic analytics',
      'Email support'
    ],
    isCurrent: false,
    buttonText: 'Current Plan',
    disabled: true
  },
  {
    name: 'Starter',
    price: '$79',
    period: '/month',
    plans: 10,
    description: 'Great for growing teams',
    features: [
      '10 active plans',
      'All Free features',
      'Advanced templates',
      'Team collaboration',
      'Custom domain email',
      'Priority support'
    ],
    isCurrent: false,
    buttonText: 'Upgrade',
    disabled: true,
    tooltip: 'Coming soon'
  },
  {
    name: 'Growth',
    price: '$199',
    period: '/month',
    plans: 50,
    description: 'For scaling operations',
    features: [
      '50 active plans',
      'All Starter features',
      'Advanced analytics',
      'Team management',
      'Custom branding',
      'API access',
      'Dedicated support'
    ],
    isCurrent: false,
    buttonText: 'Upgrade',
    disabled: true,
    tooltip: 'Coming soon'
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: 'Contact us',
    plans: 999,
    description: 'For enterprise customers',
    features: [
      'Unlimited plans',
      'All Growth features',
      'SSO integration',
      'SLA guarantee',
      'Dedicated account manager',
      'Custom integrations',
      'White-label options'
    ],
    isCurrent: false,
    buttonText: 'Contact Sales',
    disabled: false
  }
];

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const response = await fetch('/api/subscription');
        const data = await response.json();
        if (response.ok) {
          setSubscription(data);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  // Mark current tier
  const tiers = TIERS.map(tier => ({
    ...tier,
    isCurrent: subscription?.tier === tier.name.toLowerCase()
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">Choose the plan that works for your team</p>
        </div>

        {/* Current Usage */}
        {!loading && subscription && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-12">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Current Plan: {subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}</h3>
                <p className="text-gray-600">
                  You're using <strong>{subscription.currentCount} of {subscription.limit}</strong> plans ({subscription.utilizationPercent}%)
                </p>
              </div>
              <div className="text-right">
                <div className="w-32 h-32 relative">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="8"
                      strokeDasharray={`${2.827 * subscription.utilizationPercent} 282.7`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-900">{subscription.utilizationPercent}%</span>
                  </div>
                </div>
              </div>
            </div>
            {subscription.utilizationPercent >= 80 && (
              <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-amber-800">
                  ⚠️ You're nearing your plan limit. Consider upgrading to create more plans.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-lg shadow-md overflow-hidden transition transform hover:scale-105 ${
                tier.isCurrent
                  ? 'ring-2 ring-blue-600 bg-blue-50'
                  : 'bg-white hover:shadow-lg'
              }`}
            >
              {tier.isCurrent && (
                <div className="bg-blue-600 text-white py-2 text-center text-sm font-semibold">
                  Current Plan
                </div>
              )}

              <div className="p-6">
                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-600">{tier.period}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">
                    <strong>{tier.plans}</strong> {tier.plans === 999 ? 'unlimited' : ''} active plans
                  </p>
                </div>

                {/* Button */}
                <button
                  disabled={tier.disabled || tier.isCurrent}
                  title={tier.tooltip}
                  className={`w-full py-3 rounded-lg font-semibold transition mb-6 ${
                    tier.isCurrent
                      ? 'bg-gray-100 text-gray-600 cursor-default'
                      : tier.disabled
                      ? 'bg-gray-100 text-gray-600 cursor-not-allowed opacity-50'
                      : tier.name === 'Scale'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  }`}
                >
                  {tier.buttonText}
                </button>

                {/* Features */}
                <ul className="space-y-3">
                  {tier.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="text-center mt-12">
          <p className="text-gray-600 mb-6">Questions? We're here to help.</p>
          <Link
            href="/contact"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
