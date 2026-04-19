'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, CheckCircle2, Loader } from 'lucide-react';

export default function SetupPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    companyName: '',
    brandColor: '#2563eb',
    logoUrl: '',
    role: 'owner'
  });
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/csm-login');
    }
  }, [user, authLoading, router]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoPreview(event.target.result);
        setFormData({ ...formData, logoUrl: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompleteSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: formData.companyName,
          brandColor: formData.brandColor,
          logoUrl: formData.logoUrl
        })
      });

      if (res.ok) {
        setStep(3);
        setTimeout(() => router.push('/'), 2000);
      } else {
        setError('Failed to save workspace settings. Please try again.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold mx-auto mb-4 text-xl">O</div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Onboarding</h1>
          <p className="text-gray-600 text-lg">Let's set up your workspace in just a few minutes</p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-between mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex flex-col items-center relative">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold mb-2 transition ${
                step >= s 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step > s ? <CheckCircle2 size={24} /> : s}
              </div>
              <span className={`text-sm font-medium ${
                step >= s ? 'text-blue-600' : 'text-gray-600'
              }`}>
                {s === 1 ? 'Welcome' : s === 2 ? 'Workspace' : 'Done'}
              </span>
              {s < 3 && (
                <div className={`absolute top-6 left-1/2 w-full h-0.5 ${
                  step > s ? 'bg-blue-600' : 'bg-gray-200'
                }`} style={{ left: '50%' }} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome, {user?.name || 'Team Member'}!</h2>
            <div className="space-y-4 text-gray-600 mb-8">
              <p>You've been set up as a workspace member with your AppGen Auth account. Let's get your workspace configured.</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
                  <span>Authentication set up with AppGen Auth</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xs text-white">2</div>
                  <span>Configure your workspace branding</span>
                </div>
                <div className="flex gap-3">
                  <div className="w-5 h-5 rounded-full bg-gray-300 flex-shrink-0 flex items-center justify-center text-xs text-white">3</div>
                  <span>Start managing customer onboarding</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setStep(2)}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
            >
              Continue <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Workspace Configuration */}
        {step === 2 && (
          <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Configure Your Workspace</h2>
            
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="e.g., Acme Inc."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-600 mt-1">This will appear in all customer communication</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Company Logo</label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoPreview ? (
                    <div className="flex flex-col items-center gap-4">
                      <img src={logoPreview} alt="Logo" className="h-16 w-auto" />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoPreview(null);
                          setFormData({ ...formData, logoUrl: '' });
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove logo
                      </button>
                    </div>
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-input"
                      />
                      <label htmlFor="logo-input" className="cursor-pointer">
                        <p className="text-gray-900 font-medium">Click to upload logo</p>
                        <p className="text-xs text-gray-600 mt-1">or drag and drop (PNG, JPG, GIF)</p>
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Brand Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.brandColor}
                    onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                    className="h-10 w-16 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.brandColor}
                    onChange={(e) => setFormData({ ...formData, brandColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">Used for buttons, progress bars, and accents on customer page</p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-900 font-medium rounded-lg hover:bg-gray-50 transition"
              >
                Back
              </button>
              <button
                onClick={handleCompleteSetup}
                disabled={loading || !formData.companyName.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Complete Setup <ChevronRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="bg-white rounded-lg border border-gray-200 p-12 shadow-sm text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle2 size={64} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">All Set!</h2>
            <p className="text-gray-600 mb-8">Your workspace is configured. Redirecting you to the dashboard...</p>
            <div className="flex justify-center">
              <Loader size={24} className="text-blue-600 animate-spin" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
