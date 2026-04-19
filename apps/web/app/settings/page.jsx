'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/header';
import { Settings, User, Building2, Bell, Users, Mail, LogOut, Save, Loader, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Profile state
  const [profile, setProfile] = useState(null);
  
  // Profile form state
  const [profileForm, setProfileForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    bio: '',
    avatarUrl: '',
    role: ''
  });

  // Company state
  const [company, setCompany] = useState({
    companyName: '',
    brandColor: '',
    logoUrl: ''
  });

  // Notifications state
  const [notifications, setNotifications] = useState({
    emailOnBlockedTask: true,
    emailOnCompletion: true,
    dailySummaryEmail: true
  });

  // Team members state
  const [teamMembers, setTeamMembers] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    memberName: '',
    memberEmail: '',
    role: 'member'
  });

  // Email templates state
  const [emailTemplates, setEmailTemplates] = useState([]);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({
    subject: '',
    bodyHtml: '',
    previewText: '',
    isActive: true,
    fromName: '',
    replyTo: ''
  });

  useEffect(() => {
    loadProfile();
    loadSettings();
    if (activeTab === 'email') {
      loadEmailTemplates();
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'email') {
      loadEmailTemplates();
    }
  }, [activeTab]);

  const loadProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      } else {
        console.error('Error loading profile: HTTP', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error loading profile:', error?.message || error);
    }
  };

  const loadEmailTemplates = async () => {
    try {
      const res = await fetch('/api/settings/email-templates');
      if (res.ok) {
        const data = await res.json();
        setEmailTemplates(Array.isArray(data) ? data : []);
      } else {
        console.error('Error loading email templates: HTTP', res.status);
      }
    } catch (error) {
      console.error('Error loading email templates:', error?.message || error);
    }
  };

  const loadSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, companyRes, notificationsRes, teamRes] = await Promise.all([
        fetch('/api/settings/profile'),
        fetch('/api/settings/company'),
        fetch('/api/settings/notifications'),
        fetch('/api/settings/team')
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfileForm({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          bio: data.bio || '',
          avatarUrl: data.avatarUrl || '',
          role: data.role || ''
        });
      } else if (profileRes.status !== 404) {
        console.error('Failed to load profile: HTTP', profileRes.status);
      }

      if (companyRes.ok) {
        const data = await companyRes.json();
        setCompany({
          companyName: data.company_name || data.companyName || '',
          brandColor: data.brand_color || data.brandColor || '#2563EB',
          logoUrl: data.company_logo_url || data.logoUrl || ''
        });
      }

      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications({
          emailOnBlockedTask: data.email_on_blocked_task !== false,
          emailOnCompletion: data.email_on_completion !== false,
          dailySummaryEmail: data.daily_summary_email !== false
        });
      }

      if (teamRes.ok) {
        const data = await teamRes.json();
        setTeamMembers(Array.isArray(data) ? data : []);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading settings:', err?.message || err);
      setError('Failed to load settings. Please try again.');
      setLoading(false);
    }
  };

  const handleProfileSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: profileForm.firstName,
          lastName: profileForm.lastName,
          bio: profileForm.bio,
          avatarUrl: profileForm.avatarUrl
        })
      });

      if (res.ok) {
        setSuccess('Profile updated successfully');
        setTimeout(() => setSuccess(''), 3000);
        await loadProfile();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCompanySave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: company.companyName,
          brandColor: company.brandColor,
          logoUrl: company.logoUrl
        })
      });

      if (res.ok) {
        setSuccess('Company settings updated successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update company settings');
      }
    } catch (err) {
      console.error('Error saving company:', err);
      setError('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationsSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockedTask: notifications.emailOnBlockedTask,
          completion: notifications.emailOnCompletion,
          dailySummary: notifications.dailySummaryEmail
        })
      });

      if (res.ok) {
        setSuccess('Notification settings updated');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update notifications');
      }
    } catch (err) {
      console.error('Error saving notifications:', err);
      setError('Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!inviteForm.memberName.trim() || !inviteForm.memberEmail.trim()) {
      setError('Name and email are required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberName: inviteForm.memberName,
          memberEmail: inviteForm.memberEmail,
          role: inviteForm.role
        })
      });

      if (res.ok) {
        const newMember = await res.json();
        setTeamMembers([...teamMembers, newMember]);
        setInviteForm({ memberName: '', memberEmail: '', role: 'member' });
        setShowInviteForm(false);
        setSuccess('Team member invited successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to invite member');
      }
    } catch (err) {
      console.error('Error inviting member:', err);
      setError('Failed to invite team member');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Remove this team member?')) return;

    try {
      const res = await fetch('/api/settings/team', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });

      if (res.ok) {
        setTeamMembers(teamMembers.filter(m => m.id !== memberId));
        setSuccess('Team member removed');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to remove member');
      }
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove team member');
    }
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template.id);
    setTemplateForm({
      subject: template.subject || '',
      bodyHtml: template.body_html || '',
      previewText: template.preview_text || '',
      isActive: template.is_active !== false,
      fromName: template.from_name || '',
      replyTo: template.reply_to || ''
    });
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;

    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/settings/email-templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate,
          subject: templateForm.subject,
          bodyHtml: templateForm.bodyHtml,
          previewText: templateForm.previewText,
          isActive: templateForm.isActive,
          fromName: templateForm.fromName,
          replyTo: templateForm.replyTo
        })
      });

      if (res.ok) {
        setSuccess('Email template updated successfully');
        setTimeout(() => setSuccess(''), 3000);
        setEditingTemplate(null);
        await loadEmailTemplates();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update template');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to log out?')) {
      await signOut();
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size={32} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage="settings" profile={profile} unreadMessageCount={0} notifications={[]} />

      {/* Main Content */}
      <div className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full">
        <div className="flex gap-8">
          {/* Sidebar Navigation */}
          <div className="w-48">
            <nav className="space-y-2">
              {[
                { id: 'profile', label: 'Profile', icon: User },
                { id: 'company', label: 'Company', icon: Building2 },
                { id: 'notifications', label: 'Notifications', icon: Bell },
                { id: 'team', label: 'Team', icon: Users },
                { id: 'email', label: 'Email Templates', icon: Mail }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                    activeTab === id
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition mt-8 font-medium"
              >
                <LogOut size={18} />
                Log Out
              </button>
            </nav>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-start gap-3">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0" />
                <div>{success}</div>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile Settings</h1>
                <div className="space-y-6 max-w-2xl">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                      <input
                        type="text"
                        value={profileForm.firstName}
                        onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                      <input
                        type="text"
                        value={profileForm.lastName}
                        onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <input
                      type="text"
                      value={profileForm.role ? profileForm.role.charAt(0).toUpperCase() + profileForm.role.slice(1) : ''}
                      disabled
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
                    <textarea
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                      rows="4"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Tell us about yourself..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avatar URL</label>
                    <input
                      type="url"
                      value={profileForm.avatarUrl}
                      onChange={(e) => setProfileForm({ ...profileForm, avatarUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <button
                    onClick={handleProfileSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Company Tab */}
            {activeTab === 'company' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Company Settings</h1>
                <div className="space-y-6 max-w-2xl">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                    <input
                      type="text"
                      value={company.companyName}
                      onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand Color</label>
                    <div className="flex gap-4 items-center">
                      <input
                        type="color"
                        value={company.brandColor || '#2563EB'}
                        onChange={(e) => setCompany({ ...company, brandColor: e.target.value })}
                        className="w-16 h-12 rounded-lg cursor-pointer border border-gray-300"
                      />
                      <input
                        type="text"
                        value={company.brandColor || '#2563EB'}
                        onChange={(e) => setCompany({ ...company, brandColor: e.target.value })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Company Logo URL</label>
                    <input
                      type="url"
                      value={company.logoUrl}
                      onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>

                  <button
                    onClick={handleCompanySave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Notification Settings</h1>
                <div className="space-y-6 max-w-2xl">
                  <div className="space-y-4">
                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={notifications.emailOnBlockedTask}
                        onChange={(e) => setNotifications({ ...notifications, emailOnBlockedTask: e.target.checked })}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Email on Blocked Task</p>
                        <p className="text-sm text-gray-600">Receive email when a task is blocked</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={notifications.emailOnCompletion}
                        onChange={(e) => setNotifications({ ...notifications, emailOnCompletion: e.target.checked })}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Email on Task Completion</p>
                        <p className="text-sm text-gray-600">Receive email when a task is completed</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition">
                      <input
                        type="checkbox"
                        checked={notifications.dailySummaryEmail}
                        onChange={(e) => setNotifications({ ...notifications, dailySummaryEmail: e.target.checked })}
                        className="w-4 h-4 rounded cursor-pointer"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Daily Summary Email</p>
                        <p className="text-sm text-gray-600">Receive a daily summary of all activities</p>
                      </div>
                    </label>
                  </div>

                  <button
                    onClick={handleNotificationsSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Team Tab */}
            {activeTab === 'team' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Team Management</h1>
                    <p className="text-gray-600 mt-1">Manage your team members</p>
                  </div>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  >
                    + Invite Member
                  </button>
                </div>

                {showInviteForm && (
                  <form onSubmit={handleInviteMember} className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="space-y-4 max-w-2xl">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                        <input
                          type="text"
                          value={inviteForm.memberName}
                          onChange={(e) => setInviteForm({ ...inviteForm, memberName: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input
                          type="email"
                          value={inviteForm.memberEmail}
                          onChange={(e) => setInviteForm({ ...inviteForm, memberEmail: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="john@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                        <select
                          value={inviteForm.role}
                          onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="member">Member</option>
                          <option value="manager">Manager</option>
                          <option value="owner">Owner</option>
                        </select>
                      </div>
                      <div className="flex gap-3">
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                        >
                          {saving ? 'Inviting...' : 'Send Invite'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowInviteForm(false)}
                          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {teamMembers.length === 0 ? (
                  <p className="text-gray-600 py-8 text-center">No team members yet. Invite one to get started.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Role</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {teamMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-4 text-gray-900 font-medium">{member.member_name}</td>
                            <td className="px-6 py-4 text-gray-600">{member.member_email}</td>
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {member.role || 'member'}
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
                                className="text-red-600 hover:text-red-700 transition text-sm font-medium"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Email Templates Tab */}
            {activeTab === 'email' && (
              <div className="bg-white rounded-lg border border-gray-200 p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Templates</h1>
                <p className="text-gray-600 mb-8">Customize your onboarding email templates below.</p>

                {emailTemplates.length === 0 ? (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-600">No email templates found.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {emailTemplates.map((template) => (
                      <div key={template.id} className="border border-gray-200 rounded-lg overflow-hidden">
                        {editingTemplate === template.id ? (
                          <div className="p-6 bg-blue-50">
                            <div className="space-y-4 max-w-4xl">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Template Type</label>
                                <input
                                  type="text"
                                  value={template.template_type}
                                  disabled
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">From Name</label>
                                  <input
                                    type="text"
                                    value={templateForm.fromName}
                                    onChange={(e) => setTemplateForm({ ...templateForm, fromName: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Your Company Name"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Reply To</label>
                                  <input
                                    type="email"
                                    value={templateForm.replyTo}
                                    onChange={(e) => setTemplateForm({ ...templateForm, replyTo: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="support@example.com"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Subject</label>
                                <input
                                  type="text"
                                  value={templateForm.subject}
                                  onChange={(e) => setTemplateForm({ ...templateForm, subject: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Preview Text</label>
                                <input
                                  type="text"
                                  value={templateForm.previewText}
                                  onChange={(e) => setTemplateForm({ ...templateForm, previewText: e.target.value })}
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Short preview text shown in email client"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Email Body (HTML)</label>
                                <textarea
                                  value={templateForm.bodyHtml}
                                  onChange={(e) => setTemplateForm({ ...templateForm, bodyHtml: e.target.value })}
                                  rows="10"
                                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                />
                              </div>

                              <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-white cursor-pointer transition">
                                <input
                                  type="checkbox"
                                  checked={templateForm.isActive}
                                  onChange={(e) => setTemplateForm({ ...templateForm, isActive: e.target.checked })}
                                  className="w-4 h-4 rounded cursor-pointer"
                                />
                                <div>
                                  <p className="font-medium text-gray-900">Active</p>
                                  <p className="text-sm text-gray-600">This template is active and will be used for sending emails</p>
                                </div>
                              </label>

                              <div className="flex gap-3">
                                <button
                                  onClick={handleSaveTemplate}
                                  disabled={saving}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                                >
                                  {saving ? 'Saving...' : 'Save Template'}
                                </button>
                                <button
                                  onClick={() => setEditingTemplate(null)}
                                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-6 hover:bg-gray-50 transition">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                    {template.template_type?.replace(/_/g, ' ')}
                                  </h3>
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                    template.is_active
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {template.is_active ? 'Active' : 'Inactive'}
                                  </span>
                                </div>
                                <p className="text-gray-700 mb-2"><strong>Subject:</strong> {template.subject}</p>
                                {template.preview_text && (
                                  <p className="text-gray-600 text-sm mb-2"><strong>Preview:</strong> {template.preview_text}</p>
                                )}
                                {template.from_name && (
                                  <p className="text-gray-600 text-sm"><strong>From:</strong> {template.from_name}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleEditTemplate(template)}
                                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium transition"
                              >
                                Edit
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
