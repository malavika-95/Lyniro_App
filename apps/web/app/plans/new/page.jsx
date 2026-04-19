'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewPlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    company_name: '',
    customer_email: '',
    template_id: ''
  });

  // Load templates on mount
  useEffect(() => {
    async function loadTemplates() {
      try {
        setLoading(true);
        const res = await fetch('/api/templates?published=true');
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.data || []);
        } else {
          console.error('Failed to load templates');
        }
      } catch (err) {
        console.error('Error loading templates:', err);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  const validateForm = () => {
    if (!formData.customer_name.trim()) {
      setError('Customer name is required');
      return false;
    }
    if (!formData.company_name.trim()) {
      setError('Company name is required');
      return false;
    }
    if (!formData.customer_email.trim()) {
      setError('Customer email is required');
      return false;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.template_id) {
      setError('Please select a template');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: formData.customer_name.trim(),
          company_name: formData.company_name.trim(),
          customer_email: formData.customer_email.trim(),
          template_id: parseInt(formData.template_id)
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create plan');
        setSubmitting(false);
        return;
      }

      if (data.success && data.data && data.data.id) {
        // Redirect to the new plan
        router.push(`/plans/${data.data.id}`);
      } else {
        setError('Plan created but missing ID. Please check your plans.');
        setSubmitting(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to create plan');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create Onboarding Plan</h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label htmlFor="customer_name" className="block text-sm font-medium text-gray-900 mb-2">
              Customer Name *
            </label>
            <input
              type="text"
              id="customer_name"
              name="customer_name"
              value={formData.customer_name}
              onChange={handleInputChange}
              placeholder="e.g., John Smith"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={submitting}
            />
          </div>

          {/* Company Name */}
          <div>
            <label htmlFor="company_name" className="block text-sm font-medium text-gray-900 mb-2">
              Company Name *
            </label>
            <input
              type="text"
              id="company_name"
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
              placeholder="e.g., Acme Corp"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={submitting}
            />
          </div>

          {/* Customer Email */}
          <div>
            <label htmlFor="customer_email" className="block text-sm font-medium text-gray-900 mb-2">
              Customer Email *
            </label>
            <input
              type="email"
              id="customer_email"
              name="customer_email"
              value={formData.customer_email}
              onChange={handleInputChange}
              placeholder="e.g., john@acmecorp.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              disabled={submitting}
            />
          </div>

          {/* Template Dropdown */}
          <div>
            <label htmlFor="template_id" className="block text-sm font-medium text-gray-900 mb-2">
              Template *
            </label>
            <select
              id="template_id"
              name="template_id"
              value={formData.template_id}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition bg-white"
              disabled={submitting || loading}
            >
              <option value="">
                {loading ? 'Loading templates...' : 'Select a template'}
              </option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name}
                  {template.estimated_duration_days ? ` (${template.estimated_duration_days} days)` : ''}
                </option>
              ))}
            </select>
            {templates.length === 0 && !loading && (
              <p className="text-sm text-gray-500 mt-2">No templates available. Please create a template first.</p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting || loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Plan'
              )}
            </button>
            <Link href="/dashboard" className="flex-1">
              <button
                type="button"
                className="w-full px-4 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </Link>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 text-center pt-2">
            * Required fields
          </p>
        </form>
      </div>
    </div>
  );
}
