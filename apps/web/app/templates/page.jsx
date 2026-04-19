'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Copy, Trash2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [profile, setProfile] = useState(null);
  const [showAdminView, setShowAdminView] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchTemplates();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (!res.ok) {
        console.error('Failed to fetch user: HTTP', res.status);
        return;
      }
      const user = await res.json();
      setUserRole(user.role);
      setProfile(user);
    } catch (error) {
      console.error('Failed to fetch user:', error?.message || error);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/templates');
      if (res.ok) {
        const response = await res.json();
        const templates = response.success ? response.data : response;
        // Pre-built templates have csm_id = 1
        setTemplates(Array.isArray(templates) ? templates : []);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTemplates(templates.filter(t => t.id !== id));
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleDuplicate = async (id) => {
    try {
      const res = await fetch(`/api/templates/${id}/duplicate`, { method: 'POST' });
      if (res.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error('Failed to duplicate template:', error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage="templates" profile={profile} unreadMessageCount={0} notifications={[]} />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Loading templates...</p>
        </div>
      ) : userRole === 'member' ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600">Only Owners and Managers can access templates.</p>
          </div>
        </div>
      ) : (
        <div className="flex-1">
          <div className="max-w-7xl mx-auto p-6">
            <div className="flex justify-between items-center w-full mb-8">
              <div>
                <h1 className="text-4xl font-bold text-gray-900">Onboarding Templates</h1>
                <p className="text-gray-600 mt-2">Create and manage reusable onboarding templates</p>
              </div>
              <div className="flex items-center gap-3">
                {userRole === 'owner' && (
                  <button
                    onClick={() => setShowAdminView(!showAdminView)}
                    className={`px-4 py-2 font-medium rounded-lg transition ${
                      showAdminView
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {showAdminView ? 'Admin View' : 'Normal View'}
                  </button>
                )}
                <button
                  onClick={() => router.push('/templates/new')}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus size={20} />
                  New Template
                </button>
              </div>
            </div>

            {showAdminView ? (
              // Admin View - Analytics and insights
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-600 text-sm font-medium">Total Templates</p>
                    <p className="text-4xl font-bold text-gray-900 mt-2">{templates.length}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-600 text-sm font-medium">Published</p>
                    <p className="text-4xl font-bold text-green-600 mt-2">{templates.filter(t => t.status === 'published').length}</p>
                  </div>
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <p className="text-gray-600 text-sm font-medium">Drafts</p>
                    <p className="text-4xl font-bold text-yellow-600 mt-2">{templates.filter(t => t.status === 'draft').length}</p>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Template Details</h3>
                  <div className="space-y-3">
                    {templates.map(template => (
                      <div key={template.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div>
                          <p className="font-medium text-gray-900">{template.name}</p>
                          <p className="text-sm text-gray-600">Stages: {template.stage_count || 0} | Tasks: {template.task_count || 0}</p>
                        </div>
                        <span className={`px-3 py-1 rounded text-xs font-medium ${template.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {template.status === 'published' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-600 mb-4">No templates yet. Create your first template to get started.</p>
                <button
                  onClick={() => router.push('/templates/new')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition"
                >
                  <Plus size={18} />
                  New Template
                </button>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-white">
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Template</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Stages</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Tasks</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Status</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Last Edited</th>
                        <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Created By</th>
                        <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(templates) && templates.map((template, index) => {
                        const isPreBuilt = template.csm_id === 1 && template.status === 'published';
                        return (
                          <tr key={template.id} className={`border-b border-gray-200 ${isPreBuilt ? 'bg-blue-50 hover:bg-blue-100' : 'bg-white hover:bg-gray-50'}`}>
                            <td className="px-6 py-4">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{template.name}</p>
                                  {isPreBuilt && <span className="text-xs font-semibold px-2 py-1 bg-blue-200 text-blue-700 rounded">Pre-built</span>}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-1">{template.description}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900">{template.stage_count}</td>
                            <td className="px-6 py-4 text-sm text-gray-900">{template.task_count}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-block text-xs font-medium px-3 py-1 rounded ${template.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {template.status === 'published' ? 'Published' : 'Draft'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(template.updated_at)}</td>
                            <td className="px-6 py-4 text-sm text-gray-600">{isPreBuilt ? 'System' : `${template.first_name} ${template.last_name}`}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-2">
                                {!isPreBuilt && (
                                  <button
                                    onClick={() => router.push(`/templates/${template.id}`)}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded transition"
                                  >
                                    <Edit2 size={16} />
                                    Edit
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDuplicate(template.id)}
                                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded transition"
                                >
                                  <Copy size={16} />
                                  Duplicate
                                </button>
                                {userRole === 'owner' && !isPreBuilt && (
                                  <button
                                    onClick={() => setDeleteConfirm(template.id)}
                                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition"
                                  >
                                    <Trash2 size={16} />
                                    Delete
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center text-sm text-gray-600">
          <p>© 2025 Onboarding. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-900 transition">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition">Terms of Service</a>
            <a href="#" className="hover:text-gray-900 transition">Contact Support</a>
          </div>
        </div>
      </footer>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Template</h3>
            <p className="text-gray-600 mb-6">Are you sure? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
