'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X } from 'lucide-react';

export default function ImpersonationBanner() {
  const [impersonating, setImpersonating] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkImpersonation = async () => {
      try {
        const response = await fetch('/api/auth/csm-session');
        if (response.ok) {
          const result = await response.json();
          const data = result.data || result;
          if (data.impersonatedBy) {
            // User is impersonating someone
            setImpersonating({
              name: data.name,
              email: data.email,
              originalUser: data.impersonatedBy,
            });
          }
        }
      } catch (err) {
        console.error('Failed to check impersonation:', err);
      }
    };

    checkImpersonation();
  }, []);

  const handleExit = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/impersonate', { method: 'DELETE' });
      setImpersonating(null);
      router.push('/admin');
    } catch (error) {
      console.error('Exit impersonation error:', error);
      setLoading(false);
    }
  };

  if (!impersonating) {
    return null;
  }

  return (
    <div className="bg-yellow-100 border-b-2 border-yellow-400 px-6 py-4 z-50 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <AlertCircle size={20} className="text-yellow-800 flex-shrink-0" />
        <span className="text-sm font-medium text-yellow-800">
          You are logged in as: <strong>{impersonating.name}</strong>
        </span>
        <br />
        <span className="text-sm text-yellow-700 ml-7">
          You are currently impersonating this user. Your original account will be restored when you switch back.
        </span>
      </div>
      <button
        onClick={handleExit}
        disabled={loading}
        className="ml-4 px-4 py-2 bg-yellow-700 hover:bg-yellow-800 text-white text-sm font-medium rounded transition disabled:opacity-50 flex-shrink-0"
      >
        {loading ? 'Switching...' : 'Switch Back'}
      </button>
    </div>
  );
}
