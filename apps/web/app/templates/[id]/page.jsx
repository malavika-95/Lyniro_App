'use client';

import { useState, useEffect } from 'react';
import { Plus, X, Trash2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/header';

export default function TemplateBuilder() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === 'new';
  
  const [template, setTemplate] = useState({
    name: '',
    description: '',
    estimated_duration_days: 30,
    status: 'draft',
    stages: []
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [warning, setWarning] = useState(null);
  const [expandedStages, setExpandedStages] = useState({});
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchUser();
    if (!isNew) {
      fetchTemplate();
    }
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      const user = await res.json();
      setProfile(user);
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  };

  const fetchTemplate = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/templates/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        const expandMap = {};
        data.stages.forEach(stage => {
          expandMap[stage.id] = true;
        });
        setExpandedStages(expandMap);
        if (data.status === 'published') {
          setWarning('Editing this template will not affect active onboarding plans. Changes apply to new plans only.');
        }
      }
    } catch (error) {
      console.error('Failed to fetch template:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStage = () => {
    const newStage = {
      id: `new-${Date.now()}`,
      stage_number: template.stages.length + 1,
      name: `Stage ${template.stages.length + 1}`,
      description: '',
      position: template.stages.length,
      tasks: []
    };
    setTemplate(prev => ({
      ...prev,
      stages: [...prev.stages, newStage]
    }));
    setExpandedStages(prev => ({
      ...prev,
      [newStage.id]: true
    }));
  };

  const addTask = (stageId) => {
    setTemplate(prev => ({
      ...prev,
      stages: prev.stages.map(stage => {
        if (stage.id === stageId) {
          return {
            ...stage,
            tasks: [...stage.tasks, {
              id: `new-${Date.now()}`,
              name: '',
              description: '',
              assigned_to: 'customer',
              due_day: 1,
              priority: 'medium',
              position: stage.tasks.length
            }]
          };
        }
        return stage;
      })
    }));
  };

  const updateStage = (stageId, field, value) => {
    setTemplate(prev => ({
      ...prev,
      stages: prev.stages.map(stage =>
        stage.id === stageId ? { ...stage, [field]: value } : stage
      )
    }));
  };

  const updateTask = (stageId, taskId, field, value) => {
    setTemplate(prev => ({
      ...prev,
      stages: prev.stages.map(stage => {
        if (stage.id === stageId) {
          return {
            ...stage,
            tasks: stage.tasks.map(task =>
              task.id === taskId ? { ...task, [field]: value } : task
            )
          };
        }
        return stage;
      })
    }));
  };

  const deleteStage = (stageId) => {
    setTemplate(prev => ({
      ...prev,
      stages: prev.stages.filter(s => s.id !== stageId).map((s, idx) => ({
        ...s,
        stage_number: idx + 1,
        position: idx
      }))
    }));
  };

  const deleteTask = (stageId, taskId) => {
    setTemplate(prev => ({
      ...prev,
      stages: prev.stages.map(stage => {
        if (stage.id === stageId) {
          return {
            ...stage,
            tasks: stage.tasks.filter(t => t.id !== taskId).map((t, idx) => ({
              ...t,
              position: idx
            }))
          };
        }
        return stage;
      })
    }));
  };

  const handleSave = async (publish = false) => {
    if (!template.name.trim()) {
      alert('Template name is required');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: template.name,
        description: template.description,
        estimatedDurationDays: template.estimated_duration_days,
        stages: template.stages.map(stage => ({
          stage_number: stage.stage_number,
          name: stage.name,
          description: stage.description,
          position: stage.position,
          tasks: stage.tasks.map(task => ({
            name: task.name,
            description: task.description,
            assigned_to: task.assigned_to,
            due_day: parseInt(task.due_day),
            priority: task.priority,
            position: task.position
          }))
        }))
      };

      if (isNew) {
        const res = await fetch('/api/templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: template.name,
            description: template.description,
            estimatedDurationDays: template.estimated_duration_days
          })
        });
        if (res.ok) {
          const response = await res.json();
          const newTemplate = response.data || response;
          const templateId = newTemplate.id;
          
          if (!templateId) {
            throw new Error('Failed to create template - no ID returned');
          }
          
          const fullPayload = { ...payload };
          const updateRes = await fetch(`/api/templates/${templateId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fullPayload)
          });
          if (updateRes.ok) {
            if (publish) {
              await fetch(`/api/templates/${templateId}/publish`, { method: 'POST' });
            }
            router.push('/templates');
          } else {
            const errorData = await updateRes.json();
            throw new Error(errorData.error || 'Failed to update template');
          }
        } else {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Failed to create template');
        }
      } else {
        const res = await fetch(`/api/templates/${params.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          if (publish) {
            await fetch(`/api/templates/${params.id}/publish`, { method: 'POST' });
          }
          router.push('/templates');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Failed to save template:', errorMessage);
      alert(`Failed to save template: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage="templates" profile={profile} unreadMessageCount={0} notifications={[]} />

      <div className="flex-1 pb-24">
        <div className="max-w-4xl mx-auto p-6">
          {warning && (
            <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm font-medium flex gap-2">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              {warning}
            </div>
          )}

          {/* Template Details */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
              {isNew ? 'Create New Template' : 'Edit Template'}
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Template Name</label>
                <input
                  type="text"
                  value={template.name}
                  onChange={(e) => setTemplate(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Standard SaaS Onboarding"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Estimated Duration (days)</label>
                <input
                  type="number"
                  value={template.estimated_duration_days}
                  onChange={(e) => setTemplate(prev => ({ ...prev, estimated_duration_days: parseInt(e.target.value) }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Description</label>
              <input
                type="text"
                value={template.description}
                onChange={(e) => setTemplate(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Use this for standard SaaS onboarding up to 90 days"
              />
            </div>
          </div>

          {/* Stages */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Stages and Tasks</h2>

            {template.stages.map((stage, idx) => (
              <div key={stage.id} className="bg-gray-50 border border-gray-200 rounded-lg mb-4 overflow-hidden">
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50" onClick={() => setExpandedStages(prev => ({ ...prev, [stage.id]: !prev[stage.id] }))}>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Stage {stage.stage_number} — {stage.name}</h3>
                    {stage.description && <p className="text-sm text-gray-600">{stage.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteStage(stage.id);
                      }}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition"
                    >
                      <Trash2 size={18} />
                    </button>
                    {expandedStages[stage.id] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {expandedStages[stage.id] && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Stage Name</label>
                        <input
                          type="text"
                          value={stage.name}
                          onChange={(e) => updateStage(stage.id, 'name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                        <input
                          type="text"
                          value={stage.description}
                          onChange={(e) => updateStage(stage.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-900 mb-3">Tasks</h4>
                      <div className="space-y-3">
                        {stage.tasks.map((task) => (
                          <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1">Task Name</label>
                                <input
                                  type="text"
                                  value={task.name}
                                  onChange={(e) => updateTask(stage.id, task.id, 'name', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="e.g., Configure SSO"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1">Description</label>
                                <input
                                  type="text"
                                  value={task.description}
                                  onChange={(e) => updateTask(stage.id, task.id, 'description', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  placeholder="Brief description"
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1">Assigned To</label>
                                <select
                                  value={task.assigned_to}
                                  onChange={(e) => updateTask(stage.id, task.id, 'assigned_to', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="customer">Customer</option>
                                  <option value="vendor">Vendor</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1">Due Day</label>
                                <input
                                  type="number"
                                  value={task.due_day}
                                  onChange={(e) => updateTask(stage.id, task.id, 'due_day', parseInt(e.target.value))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  min="1"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-900 mb-1">Priority</label>
                                <select
                                  value={task.priority}
                                  onChange={(e) => updateTask(stage.id, task.id, 'priority', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                  <option value="low">Low</option>
                                  <option value="medium">Medium</option>
                                  <option value="high">High</option>
                                </select>
                              </div>
                              <div className="flex items-end">
                                <button
                                  onClick={() => deleteTask(stage.id, task.id)}
                                  className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition text-sm font-medium"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => addTask(stage.id)}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition text-sm font-medium"
                      >
                        <Plus size={16} />
                        Add Task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={addStage}
              className="inline-flex items-center gap-2 px-4 py-3 text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium"
            >
              <Plus size={18} />
              Add Stage
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-4xl mx-auto flex justify-end gap-3">
          <button
            onClick={() => router.back()}
            className="px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={() => handleSave(false)}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-medium disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            onClick={() => {
              if (window.confirm('Publishing this template will make it available for new plans. Existing active plans will not be affected.')) {
                handleSave(true);
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  );
}
