'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Plus, MessageCircle, AlertCircle, TrendingUp, X } from 'lucide-react';
import Header from '@/components/header';
import { LimitReachedModal, UsageWarningBanner } from '@/components/subscription-usage';

export default function DashboardPage() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [expandedPlanId, setExpandedPlanId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [selectedPlanForTask, setSelectedPlanForTask] = useState(null);
  const [templates, setTemplates] = useState({});
  const [newCustomerForm, setNewCustomerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    companyName: '',
    planName: '',
    goLiveDate: '',
    templateId: ''
  });
  const [publishedTemplates, setPublishedTemplates] = useState([]);
  const [newTaskForm, setNewTaskForm] = useState({
    taskName: '',
    description: '',
    assignedTo: 'vendor',
    priority: 'medium',
    dueDate: '',
    stageId: ''
  });
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [userRole, setUserRole] = useState('user');
  const [subscriptionStats, setSubscriptionStats] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState(null);

  useEffect(() => {
    loadDashboard();
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadMessageCount(data.messageNotifications || 0);
      } else {
        setUnreadMessageCount(0);
      }
    } catch (error) {
      // Silently fail - unread count is not critical
      setUnreadMessageCount(0);
    }
  };

  const loadDashboard = async () => {
    try {
      console.log('[Dashboard] Loading plans...');
      const plansRes = await fetch('/api/plans');
      console.log('[Dashboard] Plans response:', plansRes.status);
      if (plansRes.ok) {
        const response = await plansRes.json();
        const plansData = response.data || response || [];
        setPlans(Array.isArray(plansData) ? plansData : []);
      }

      console.log('[Dashboard] Loading profile...');
      const profileRes = await fetch('/api/settings/profile');
      console.log('[Dashboard] Profile response:', profileRes.status);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setUserRole(data.role || 'user');
      }

      console.log('[Dashboard] Loading templates...');
      const templatesRes = await fetch('/api/templates');
      console.log('[Dashboard] Templates response:', templatesRes.status);
      if (templatesRes.ok) {
        const data = await templatesRes.json();
        const templates = data.data || data || [];
        const templatesMap = {};
        templates.forEach(t => {
          templatesMap[t.id] = t;
        });
        setTemplates(templatesMap);
      }

      console.log('[Dashboard] Loading published templates...');
      const publishedRes = await fetch('/api/templates?published=true');
      console.log('[Dashboard] Published templates response:', publishedRes.status);
      if (publishedRes.ok) {
        const data = await publishedRes.json();
        setPublishedTemplates(data.data || data || []);
      }

      console.log('[Dashboard] Loading notifications...');
      const notificationsRes = await fetch('/api/notifications/tasks');
      console.log('[Dashboard] Notifications response:', notificationsRes.status);
      if (notificationsRes.ok) {
        const data = await notificationsRes.json();
        setNotifications(data);
      }

      console.log('[Dashboard] Loading subscription stats...');
      const subStatsRes = await fetch('/api/subscription/stats');
      console.log('[Dashboard] Subscription stats response:', subStatsRes.status);
      if (subStatsRes.ok) {
        const data = await subStatsRes.json();
        setSubscriptionStats(data.data);
      }

      setLoading(false);
      console.log('[Dashboard] Dashboard loaded successfully');
    } catch (error) {
      console.error('Failed to load dashboard:', error.message || error);
      setLoading(false);
    }
  };

  const getCompletionPercentage = (plan) => {
    if (!plan.taskCount || plan.taskCount === 0) return 0;
    return Math.round((plan.completedCount / plan.taskCount) * 100);
  };

  const getRiskLevel = (plan) => {
    const completion = getCompletionPercentage(plan);
    const blockedCount = plan.blockedCount || 0;
    const isOverdue = plan.go_live_date && new Date(plan.go_live_date) < new Date();

    if (completion === 100) {
      return { level: 'None', color: 'bg-green-100', textColor: 'text-green-700' };
    } else if (completion < 30 || blockedCount >= 3 || isOverdue) {
      return { level: 'Critical', color: 'bg-red-100', textColor: 'text-red-700' };
    } else if (completion < 50 || blockedCount >= 1) {
      return { level: 'High', color: 'bg-orange-100', textColor: 'text-orange-700' };
    } else {
      return { level: 'Low', color: 'bg-yellow-100', textColor: 'text-yellow-700' };
    }
  };

  // Calculate metrics
  const activePlans = plans.filter(p => getCompletionPercentage(p) < 100);
  const totalBlockedTasks = plans.reduce((sum, plan) => {
    return sum + (plan.blockedCount || 0);
  }, 0);
  const avgCompletion = plans.length > 0 
    ? Math.round(plans.reduce((sum, p) => sum + getCompletionPercentage(p), 0) / plans.length)
    : 0;

  const filteredPlans = filterStatus === 'all' 
    ? plans
    : filterStatus === 'active'
    ? activePlans
    : plans.filter(p => getCompletionPercentage(p) === 100);

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: `${newCustomerForm.firstName} ${newCustomerForm.lastName}`,
          company_name: newCustomerForm.companyName,
          customer_email: newCustomerForm.email,
          template_id: parseInt(newCustomerForm.templateId) || null
        })
      });

      if (res.status === 403) {
        // Plan limit reached
        const data = await res.json();
        setLimitModalData({
          type: 'PLAN_LIMIT',
          limit: data.subscription?.limit,
          current: data.subscription?.current
        });
        setShowLimitModal(true);
        setShowNewCustomerModal(false);
        return;
      }

      if (res.ok) {
        const response = await res.json();
        const newPlan = response.data || response;
        setPlans([...plans, newPlan]);
        setShowNewCustomerModal(false);
        setNewCustomerForm({
          firstName: '',
          lastName: '',
          email: '',
          companyName: '',
          planName: '',
          goLiveDate: '',
          templateId: ''
        });
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to create customer');
      }
    } catch (error) {
      console.error('Failed to create customer:', error);
      alert('An error occurred while creating the customer');
    }
  };

  const handleAddCustomTask = async (e) => {
    e.preventDefault();
    if (!selectedPlanForTask || !newTaskForm.stageId) return;

    try {
      const res = await fetch(`/api/plans/${selectedPlanForTask.id}/custom-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTaskForm)
      });

      if (res.ok) {
        const response = await res.json();
        const newTask = response.data || response;
        const updatedPlans = plans.map(p => {
          if (p.id === selectedPlanForTask.id) {
            return {
              ...p,
              tasks: [...(p.tasks || []), newTask]
            };
          }
          return p;
        });
        setPlans(updatedPlans);
        setShowAddTaskModal(false);
        setNewTaskForm({
          taskName: '',
          description: '',
          assignedTo: 'vendor',
          priority: 'medium',
          dueDate: '',
          stageId: ''
        });
        setSelectedPlanForTask(null);
      }
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const openAddTaskModal = (plan) => {
    setSelectedPlanForTask(plan);
    setShowAddTaskModal(true);
    setNewTaskForm({
      taskName: '',
      description: '',
      assignedTo: 'vendor',
      priority: 'medium',
      dueDate: '',
      stageId: plan.stages?.[0]?.id || ''
    });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/csm-session', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.push('/csm-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        currentPage="dashboard" 
        profile={profile}
        unreadMessageCount={unreadMessageCount}
        notifications={notifications}
      />

      {/* Main Content */}
      <div className="flex-1 mb-12">
        <div className="max-w-7xl mx-auto px-6 pt-8">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-2">Manage your active customer onboarding plans</p>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Active Plans</p>
                <p className="text-5xl font-bold text-gray-900 mt-4">{activePlans.length}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition">
              <div>
                <p className={`text-sm font-medium uppercase tracking-wide ${totalBlockedTasks > 0 ? 'text-red-600' : 'text-gray-500'}`}>Blocked Tasks</p>
                <p className={`text-5xl font-bold mt-4 ${totalBlockedTasks > 0 ? 'text-red-600' : 'text-gray-900'}`}>{totalBlockedTasks}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-8 shadow-sm hover:shadow-md transition">
              <div>
                <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Avg Completion</p>
                <p className="text-5xl font-bold text-gray-900 mt-4">{avgCompletion}%</p>
              </div>
            </div>
          </div>

          {/* Usage Warning */}
          {subscriptionStats && subscriptionStats.plans.usagePercent >= 80 && (
            <div className="mb-8">
              <UsageWarningBanner
                type="plans"
                usagePercent={subscriptionStats.plans.usagePercent}
                limit={subscriptionStats.plans.limit}
                onUpgradeClick={() => router.push('/subscription')}
              />
            </div>
          )}

          {/* Filters and Actions */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-2">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                  filterStatus === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                All Plans
              </button>
              <button 
                onClick={() => setFilterStatus('active')}
                className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                  filterStatus === 'active' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                In Progress
              </button>
              <button 
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-2 rounded-lg transition text-xs font-semibold ${
                  filterStatus === 'completed' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Completed
              </button>
            </div>
            <button 
              onClick={() => setShowNewCustomerModal(true)}
              disabled={subscriptionStats && subscriptionStats.plans.usagePercent >= 100}
              className={`px-4 py-2.5 rounded-lg transition text-sm font-semibold flex items-center gap-2 ${
                subscriptionStats && subscriptionStats.plans.usagePercent >= 100
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <Plus size={18} />
              New Customer
            </button>
          </div>

          {/* Plans Table */}
          {filteredPlans.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-xl p-12 text-center shadow-sm">
              <p className="text-gray-500">
                {filterStatus === 'all' 
                  ? 'No plans yet. Create your first onboarding plan to get started.'
                  : filterStatus === 'active'
                  ? 'No active plans.'
                  : 'No completed plans yet.'
                }
              </p>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full">
                <thead className="bg-white border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Progress</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Blocked</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Risk</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Last Activity</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPlans.map((plan) => {
                    const completion = getCompletionPercentage(plan);
                    const isExpanded = expandedPlanId === plan.id;
                    const templateName = templates[plan.template_id]?.name || 'No template';
                    const stageCount = plan.stages?.length || 0;
                    
                    return (
                      <React.Fragment key={plan.id}>
                        {/* Table Row */}
                        <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => setExpandedPlanId(isExpanded ? null : plan.id)}>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <p className="font-semibold text-gray-900 text-sm">{plan.customer_name}</p>
                              <p className="text-gray-500 text-xs">{plan.company_name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3 w-44">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full transition-all ${completion === 100 ? 'bg-teal-500' : 'bg-blue-500'}`}
                                    style={{ width: `${completion}%` }}
                                  />
                                </div>
                              </div>
                              <span className="text-sm font-semibold text-gray-900 whitespace-nowrap w-10 text-right">{completion}%</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
                              completion === 100 
                                ? 'bg-teal-100 text-teal-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {completion === 100 ? 'Stage 4' : 'Stage 2'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {(plan.blockedCount || 0) > 0 ? (
                              <span className="text-xs font-semibold text-white bg-red-600 px-2.5 py-1 rounded-full">
                                {plan.blockedCount} blocked
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${getRiskLevel(plan).color} ${getRiskLevel(plan).textColor}`}>
                              {getRiskLevel(plan).level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">{
                            plan.updated_at 
                              ? new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                              : '—'
                          }</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedPlanId(isExpanded ? null : plan.id);
                              }}
                              className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                              {isExpanded ? 'Hide' : 'View'}
                            </button>
                          </td>
                        </tr>
                        
                        {/* Expanded Details */}
                        {isExpanded && (
                          <tr>
                            <td colSpan="6" className="px-6 py-6 bg-gray-50">
                              <div className="space-y-6">
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Email</p>
                                    <p className="text-sm text-gray-900">{plan.customer_email}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Created</p>
                                    <p className="text-sm text-gray-900">{new Date(plan.created_at).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-gray-600 uppercase mb-2">Completion</p>
                                    <p className="text-sm font-semibold text-gray-900">{completion}%</p>
                                  </div>
                                </div>

                                {/* Tasks Summary */}
                                {plan.taskCount > 0 && (
                                  <div>
                                    <p className="text-sm font-semibold text-gray-900 mb-3">Tasks Summary</p>
                                    <div className="space-y-2">
                                      <div className="text-sm text-gray-700">
                                        <strong>{plan.completedCount || 0}</strong> of <strong>{plan.taskCount || 0}</strong> tasks completed
                                      </div>
                                      {(plan.blockedCount || 0) > 0 && (
                                        <div className="text-sm text-red-700 font-medium">
                                          <AlertCircle className="inline w-4 h-4 mr-1" />
                                          {plan.blockedCount} task{plan.blockedCount > 1 ? 's' : ''} blocked
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-4 border-t border-gray-200">
                                  <button 
                                    onClick={() => router.push(`/csm/plans/${plan.id}`)}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2">
                                    Open Plan
                                  </button>
                                  <button 
                                    onClick={() => openAddTaskModal(plan)}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium flex items-center gap-2">
                                    <Plus size={16} />
                                    Add Task
                                  </button>
                                  <button 
                                    onClick={() => router.push(`/messages?planId=${plan.id}`)}
                                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-medium">
                                    Message
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && selectedPlanForTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Add Custom Task</h2>
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddCustomTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                <input 
                  type="text" 
                  required
                  value={newTaskForm.taskName}
                  onChange={(e) => setNewTaskForm({...newTaskForm, taskName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={newTaskForm.description}
                  onChange={(e) => setNewTaskForm({...newTaskForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To *</label>
                <select 
                  value={newTaskForm.assignedTo}
                  onChange={(e) => setNewTaskForm({...newTaskForm, assignedTo: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="vendor">Vendor/Team</option>
                  <option value="customer">Customer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select 
                  value={newTaskForm.priority}
                  onChange={(e) => setNewTaskForm({...newTaskForm, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
                <select 
                  value={newTaskForm.stageId}
                  onChange={(e) => setNewTaskForm({...newTaskForm, stageId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                  <option value="">Select a stage</option>
                  {selectedPlanForTask.stages?.map((stage, idx) => (
                    <option key={`stage-${stage.id}-${idx}`} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={newTaskForm.dueDate}
                  onChange={(e) => setNewTaskForm({...newTaskForm, dueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium">
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium">
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {/* Limit Reached Modal */}
      {showLimitModal && limitModalData && (
        <LimitReachedModal
          type={limitModalData.type}
          limit={limitModalData.limit}
          current={limitModalData.current}
          onUpgrade={() => router.push('/subscription')}
          onClose={() => setShowLimitModal(false)}
        />
      )}

      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Customer</h2>
              <button 
                onClick={() => setShowNewCustomerModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCustomerForm.firstName}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input 
                    type="text" 
                    required
                    value={newCustomerForm.lastName}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  required
                  value={newCustomerForm.email}
                  onChange={(e) => setNewCustomerForm({...newCustomerForm, email: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                <input 
                  type="text" 
                  required
                  value={newCustomerForm.companyName}
                  onChange={(e) => setNewCustomerForm({...newCustomerForm, companyName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name (optional)</label>
                <input 
                  type="text" 
                  value={newCustomerForm.planName}
                  onChange={(e) => setNewCustomerForm({...newCustomerForm, planName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Go-Live Date (optional)</label>
                <input 
                  type="date" 
                  value={newCustomerForm.goLiveDate}
                  onChange={(e) => setNewCustomerForm({...newCustomerForm, goLiveDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                {publishedTemplates.length === 0 ? (
                  <p className="text-sm text-gray-600 italic">No published templates yet. Create one in Templates first.</p>
                ) : (
                  <select 
                    value={newCustomerForm.templateId}
                    onChange={(e) => setNewCustomerForm({...newCustomerForm, templateId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Select a template (optional)</option>
                    {publishedTemplates.map((template, idx) => (
                      <option key={`template-${template.id}-${idx}`} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
