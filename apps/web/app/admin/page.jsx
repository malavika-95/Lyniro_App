'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader, ArrowLeft } from 'lucide-react';
import Header from '@/components/header';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(null);
  const [error, setError] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'MEMBER',
    password: ''
  });
  const [bulkUsersCsv, setBulkUsersCsv] = useState('');
  const [creatingUsers, setCreatingUsers] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationData, setImpersonationData] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/csm-session');
      const data = await response.json();

      if (!response.ok || !data.data) {
        router.push('/csm-login');
        return;
      }

      if (data.data.role !== 'OWNER') {
        router.push('/');
        return;
      }

      setUser(data.data);

      // Check if this user is impersonated (has impersonated_by_id set)
      if (data.data.impersonated_by_id) {
        setIsImpersonating(true);
        setImpersonationData({
          impersonating: true,
          targetName: `${data.data.first_name} ${data.data.last_name}`,
          impersonatedBy: data.data.impersonated_by_id
        });
      } else {
        setIsImpersonating(false);
        setImpersonationData(null);
      }

      await Promise.all([fetchUsers(), fetchClients(), fetchAuditLog()]);
    } catch (err) {
      console.error('Auth check error:', err);
      router.push('/csm-login');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Fetch clients error:', err);
    }
  };

  const fetchAuditLog = async () => {
    try {
      const response = await fetch('/api/admin/audit-log');
      if (response.ok) {
        const data = await response.json();
        setAuditLog(data);
      }
    } catch (err) {
      console.error('Fetch audit log error:', err);
    }
  };

  const handleLoginAsUser = async (targetUser) => {
    setLoadingAction(targetUser.id);
    try {
      const response = await fetch('/api/auth/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: targetUser.id })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to impersonate user');
        setLoadingAction(null);
        return;
      }

      router.push('/');
    } catch (err) {
      console.error('Impersonate error:', err);
      setError('Failed to impersonate user');
      setLoadingAction(null);
    }
  };

  const handleLoginAsClient = async (client) => {
    setLoadingAction(client.id);
    try {
      const response = await fetch('/api/auth/impersonate-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetCustomerId: client.id })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to view as client');
        setLoadingAction(null);
        return;
      }

      router.push('/customer');
    } catch (err) {
      console.error('View as client error:', err);
      setError('Failed to view as client');
      setLoadingAction(null);
    }
  };

  const handleSwitchBack = async () => {
    setLoadingAction('switchback');
    try {
      const response = await fetch('/api/auth/impersonate', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to switch back');
        setLoadingAction(null);
        return;
      }

      setIsImpersonating(false);
      setImpersonationData(null);
      setLoadingAction(null);
      router.push('/');
    } catch (err) {
      console.error('Switch back error:', err);
      setError('Failed to switch back to original account');
      setLoadingAction(null);
    }
  };

  const handleCreateSingleUser = async () => {
    if (!createUserForm.email || !createUserForm.first_name) {
      setError('Email and first name are required');
      return;
    }

    setCreatingUsers(true);
    setCreateResult(null);

    try {
      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          users: [createUserForm]
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create user');
      } else {
        setCreateResult(data);
        setCreateUserForm({ email: '', first_name: '', last_name: '', role: 'MEMBER', password: '' });
        await fetchUsers();
        setError('');
      }
    } catch (err) {
      console.error('Create user error:', err);
      setError('Failed to create user');
    } finally {
      setCreatingUsers(false);
    }
  };

  const handleBulkCreateUsers = async () => {
    if (!bulkUsersCsv.trim()) {
      setError('Please paste user data');
      return;
    }

    setCreatingUsers(true);
    setCreateResult(null);

    try {
      const lines = bulkUsersCsv.split('\n').filter(l => l.trim());
      const users = [];

      for (const line of lines) {
        const [email, first_name, last_name, role] = line.split(',').map(s => s.trim());
        if (email) {
          users.push({
            email,
            first_name: first_name || 'User',
            last_name: last_name || '',
            role: role || 'MEMBER'
          });
        }
      }

      if (users.length === 0) {
        setError('No valid users found in data');
        setCreatingUsers(false);
        return;
      }

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create users');
      } else {
        setCreateResult(data);
        setBulkUsersCsv('');
        await fetchUsers();
        setError('');
      }
    } catch (err) {
      console.error('Bulk create error:', err);
      setError('Failed to create users');
    } finally {
      setCreatingUsers(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentPage="admin" profile={user} unreadMessageCount={0} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {isImpersonating && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="font-medium text-yellow-900">You are logged in as: <span className="font-bold">{impersonationData?.targetName}</span></p>
              <p className="text-sm text-yellow-700">You are currently impersonating this user. Your original account will be restored when you switch back.</p>
            </div>
            <button
              onClick={handleSwitchBack}
              disabled={loadingAction === 'switchback'}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-medium text-sm hover:bg-yellow-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap ml-4"
            >
              {loadingAction === 'switchback' ? 'Switching...' : 'Switch Back'}
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-white rounded-lg transition"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Admin Portal</h1>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {createResult && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-medium">Success! Created {createResult.createdCount} user(s)</p>
            {createResult.data?.errors && createResult.data.errors.length > 0 && (
              <div className="mt-2 text-sm">
                <p className="font-medium mb-1">Errors ({createResult.data.errors.length}):</p>
                <ul className="list-disc list-inside">
                  {createResult.data.errors.map((err, i) => (
                    <li key={i}>{err.email}: {err.error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Section 0: Create User */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Create User(s)</h2>
            <button
              onClick={() => setShowCreateUser(!showCreateUser)}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              {showCreateUser ? 'Hide' : 'Show'}
            </button>
          </div>

          {showCreateUser && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Single User */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Add Single User</h3>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={createUserForm.email}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="First Name"
                    value={createUserForm.first_name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    placeholder="Last Name (optional)"
                    value={createUserForm.last_name}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <select
                    value={createUserForm.role}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                  <input
                    type="password"
                    placeholder="Password (optional)"
                    value={createUserForm.password}
                    onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleCreateSingleUser}
                    disabled={creatingUsers}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {creatingUsers ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>

              {/* Bulk Import */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">Bulk Add Users</h3>
                <p className="text-xs text-gray-600 mb-3">Format: email, first_name, last_name, role (one per line)</p>
                <textarea
                  placeholder={'user1@example.com, John, Doe, MEMBER\nuser2@example.com, Jane, Smith, MANAGER'}
                  value={bulkUsersCsv}
                  onChange={(e) => setBulkUsersCsv(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-blue-500 h-[180px] font-mono text-xs"
                />
                <button
                  onClick={handleBulkCreateUsers}
                  disabled={creatingUsers}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-3"
                >
                  {creatingUsers ? 'Creating...' : 'Bulk Create'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Team Members */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Team Members</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-600">
                      No team members found
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {u.first_name} {u.last_name}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'owner'
                            ? 'bg-purple-100 text-purple-700'
                            : u.role === 'manager'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {u.status || 'active'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {u.role !== 'owner' && u.id !== user.userId ? (
                          <button
                            onClick={() => handleLoginAsUser(u)}
                            disabled={loadingAction === u.id}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {loadingAction === u.id ? 'Loading...' : 'Login as User'}
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Clients */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Clients</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Plan</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Created</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody>
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-gray-600">
                      No clients found
                    </td>
                  </tr>
                ) : (
                  clients.map(c => (
                    <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">{c.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{c.plan_name}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <button
                          onClick={() => handleLoginAsClient(c)}
                          disabled={loadingAction === c.id}
                          className="px-3 py-1.5 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingAction === c.id ? 'Loading...' : 'View as Client'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 3: Audit Log */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Impersonation Log</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Admin User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Target User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-gray-900">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-8 text-gray-600">
                      No impersonation activity
                    </td>
                  </tr>
                ) : (
                  auditLog.map(entry => (
                    <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {entry.impersonator_name || `User ${entry.impersonator_id}`}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-900">
                        {entry.target_name || `User ${entry.target_user_id}`}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          entry.action === 'impersonation_started'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {entry.action === 'impersonation_started' ? 'Started' : 'Ended'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {new Date(entry.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
