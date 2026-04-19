'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Trash2, Mail, X, CheckCircle2, Loader } from 'lucide-react';

export default function TeamPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [userRole, setUserRole] = useState('user');
  const [formData, setFormData] = useState({ name: '', email: '', role: 'user' });
  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const [profileRes, teamRes] = await Promise.all([
        fetch('/api/settings/profile'),
        fetch('/api/settings/team')
      ]);

      if (profileRes.ok) {
        const profile = await profileRes.json();
        setUserRole(profile.role || 'user');
      }

      if (teamRes.ok) {
        const team = await teamRes.json();
        setTeamMembers(team);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load team:', error);
      setLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: formData.name,
          memberEmail: formData.email,
          role: formData.role
        })
      });

      if (res.ok) {
        const newMember = await res.json();
        setTeamMembers([...teamMembers, newMember]);
        setFormData({ name: '', email: '', role: 'user' });
        setShowInviteModal(false);
        setNotification('Team member invited!');
        setTimeout(() => setNotification(''), 3000);
      }
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this team member?')) return;

    try {
      await fetch('/api/settings/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      setTeamMembers(teamMembers.filter(m => m.id !== memberId));
      setNotification('Team member removed');
      setTimeout(() => setNotification(''), 3000);
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  if (userRole !== 'owner' && userRole !== 'manager') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">You don't have permission to access this page</p>
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">O</div>
            <span className="text-lg font-bold text-gray-900">Onboarding</span>
          </div>
          <nav className="flex gap-8">
            <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900 transition">Dashboard</button>
            <button onClick={() => router.push('/templates')} className="text-gray-600 hover:text-gray-900 transition">Templates</button>
            <button onClick={() => router.push('/messages')} className="text-gray-600 hover:text-gray-900 transition">Messages</button>
            <button className="text-gray-900 font-medium hover:text-blue-600 transition">Team</button>
            <button onClick={() => router.push('/settings')} className="text-gray-600 hover:text-gray-900 transition">Settings</button>
          </nav>
          <button onClick={() => router.push('/')} className="text-gray-600 hover:text-gray-900">←</button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 mt-20 mb-12">
        <div className="max-w-6xl mx-auto px-6">
          {notification && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 size={16} />
              {notification}
            </div>
          )}

          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Team Management</h1>
              <p className="text-gray-600 mt-2">Manage your team members and their roles</p>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Invite Member
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader size={32} className="text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {teamMembers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-600">
                        No team members yet. Invite one to get started.
                      </td>
                    </tr>
                  ) : (
                    teamMembers.map((member) => (
                      <tr key={member.id} className="hover:bg-gray-50 transition">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{member.member_name}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-gray-600">
                            <Mail size={14} />
                            {member.member_email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                            User
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            member.accepted_at
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {member.accepted_at ? 'Accepted' : 'Pending'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="text-red-600 hover:text-red-700 transition p-2 hover:bg-red-50 rounded font-medium text-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Invite Team Member</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Full Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="john@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="user">User (View & Edit tasks)</option>
                  <option value="manager">Manager (Team lead)</option>
                </select>
                <p className="text-xs text-gray-600 mt-1">Only Owners can assign Manager role</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
