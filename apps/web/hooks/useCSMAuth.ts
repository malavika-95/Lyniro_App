import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function useCSMAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/csm-session');
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Session check error:', err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const signOut = async () => {
    try {
      await fetch('/api/auth/csm-session', { method: 'POST' });
      setIsAuthenticated(false);
      setUser(null);
      router.push('/csm-login');
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    signOut,
  };
}
