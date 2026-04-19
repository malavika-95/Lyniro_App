'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import SearchBar from './search-bar';

export default function Header({ currentPage, profile, unreadMessageCount, notifications = [], userRole = null }) {
  const router = useRouter();
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/csm-session', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.push('/csm-login');
  };

  return (
    <header className="sticky top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">L</div>
          <span className="text-lg font-bold text-gray-900">Lyniro</span>
        </div>
        
        <SearchBar />

        <nav className="flex gap-8">
          <button 
            onClick={() => router.push('/')} 
            className={`font-medium transition pb-2 border-b-2 ${
              currentPage === 'dashboard' 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-600 hover:text-gray-900 border-transparent'
            }`}
          >
            Dashboard
          </button>
          <button 
            onClick={() => router.push('/analytics')} 
            className={`font-medium transition pb-2 border-b-2 ${
              currentPage === 'analytics' 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-600 hover:text-gray-900 border-transparent'
            }`}
          >
            Analytics
          </button>
          <button 
            onClick={() => router.push('/messages')} 
            className={`font-medium transition relative pb-2 border-b-2 ${
              currentPage === 'messages' 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-600 hover:text-gray-900 border-transparent'
            }`}
          >
            Messages
            {unreadMessageCount > 0 && (
              <span className="absolute -top-1 -right-3 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadMessageCount}
              </span>
            )}
          </button>
          <button 
            onClick={() => router.push('/templates')} 
            className={`font-medium transition pb-2 border-b-2 ${
              currentPage === 'templates' 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-600 hover:text-gray-900 border-transparent'
            }`}
          >
            Templates
          </button>
          <button 
            onClick={() => router.push('/settings')} 
            className={`font-medium transition pb-2 border-b-2 ${
              currentPage === 'settings' 
                ? 'text-gray-900 border-gray-900' 
                : 'text-gray-600 hover:text-gray-900 border-transparent'
            }`}
          >
            Settings
          </button>
          {(userRole === 'owner' || profile?.role === 'owner') && (
            <button 
              onClick={() => router.push('/admin')} 
              className={`font-medium transition pb-2 border-b-2 ${
                currentPage === 'admin' 
                  ? 'text-gray-900 border-gray-900' 
                  : 'text-gray-600 hover:text-gray-900 border-transparent'
              }`}
            >
              Admin
            </button>
          )}
        </nav>

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className="relative text-gray-600 hover:text-gray-900 transition p-2"
              title="Notifications"
            >
              <Bell size={18} />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {Math.min(notifications.length, 9)}
                </span>
              )}
            </button>
            {showNotificationPanel && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                </div>
                {notifications.length === 0 ? (
                  <p className="p-4 text-center text-gray-600 text-sm">No new notifications</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {notifications.map((notif) => (
                      <div key={notif.id} className="p-3 hover:bg-gray-50 cursor-pointer text-sm">
                        <p className="font-medium text-gray-900">{notif.title || 'Notification'}</p>
                        <p className="text-gray-600 text-xs mt-1">{notif.type}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{profile?.first_name}</p>
            <p className="text-xs text-gray-600">{profile?.role || 'User'}</p>
          </div>

          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {(profile?.first_name?.[0] || 'U').toUpperCase()}{(profile?.last_name?.[0] || '').toUpperCase()}
          </div>

          <button 
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 transition p-2"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
