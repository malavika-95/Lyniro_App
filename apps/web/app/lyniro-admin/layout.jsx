'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, LayoutDashboard, Building2, FileText, Settings } from 'lucide-react';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/lyniro-admin/auth/session');
        if (response.ok) {
          const data = await response.json();
          console.log('Admin session loaded:', data.admin);\n          setAdmin(data.admin);
        } else {
          console.log('No admin session, redirecting to login');\n          router.push('/lyniro-admin/login');
        }
      } catch (error) {
        console.error('Session check error:', error);\n        router.push('/lyniro-admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/lyniro-admin/auth/logout', { method: 'POST' });
      router.push('/lyniro-admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-white flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-blue-400">Lyniro Admin</h1>
          <p className="text-xs text-gray-400 mt-2">{admin.email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <Link
            href="/lyniro-admin"
            className="flex items-center gap-3 px-4 py-2 rounded hover:bg-slate-800 transition"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link
            href="/lyniro-admin/vendors"
            className="flex items-center gap-3 px-4 py-2 rounded hover:bg-slate-800 transition"
          >
            <Building2 size={20} />
            <span>Vendors</span>
          </Link>
          <Link
            href="/lyniro-admin/audit-log"
            className="flex items-center gap-3 px-4 py-2 rounded hover:bg-slate-800 transition"
          >
            <FileText size={20} />
            <span>Audit Log</span>
          </Link>
          <Link
            href="/lyniro-admin/settings"
            className="flex items-center gap-3 px-4 py-2 rounded hover:bg-slate-800 transition"
          >
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded text-red-400 hover:bg-slate-800 transition"
          >
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}
