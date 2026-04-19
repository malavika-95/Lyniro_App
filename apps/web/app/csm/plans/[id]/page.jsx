'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Check, ChevronDown, LogOut, MessageSquare, Plus, AlertCircle, ArrowLeft } from 'lucide-react';
import Header from '@/components/header';

export default function PlanDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState(null);
  const [plan, setPlan] = useState(null);
  const [template, setTemplate] = useState(null);
  const [stages, setStages] = useState([]);
  const [expandedStages, setExpandedStages] = useState(new Set());
  const [tasks, setTasks] = useState([]);
  const [sharedNotes, setSharedNotes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [newNote, setNewNote] = useState('');
  const [stageNotes, setStageNotes] = useState({});
  const [stageNoteInput, setStageNoteInput] = useState({});
  const [newMessage, setNewMessage] = useState('');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [blockingTask, setBlockingTask] = useState(null);
  const [blockReason, setBlockReason] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', email: '', phone_number: '' });
  const [activeTab, setActiveTab] = useState('tasks');
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    fetchPlanData();
  }, [params.id]);

  const fetchPlanData = async () => {
    try {
      const csmSessionRes = await fetch('/api/auth/csm-session');
      
      if (!csmSessionRes.ok) {
        setErrorMessage('Session expired. Please log in again.');
        return;
      }

      const sessionData = await csmSessionRes.json();
      setUser(sessionData);

      // params.id might be a Promise or a string in Next.js 15
      let planId = params.id;
      if (planId instanceof Promise) {
        planId = await planId;
      }
      
      if (!planId) {
        setErrorMessage('Invalid plan ID');
        setLoading(false);
        return;
      }
      
      const [planRes, notesRes, messagesRes, contactsRes] = await Promise.all([
        fetch(`/api/plans/${planId}`),
        fetch(`/api/plans/${planId}/notes`),
        fetch(`/api/plans/${planId}/messages`),
        fetch(`/api/plans/${planId}/contacts`)
      ]);

      if (planRes.ok) {
        const data = await planRes.json();
        console.log('📋 [CSM Plan Page] Received plan data:', data);
        
        if (data.error) {
          throw new Error(data.error);
        }
        
        setPlan(data);
        const stagesArray = Array.isArray(data.stages) ? data.stages : [];
        const tasksArray = Array.isArray(data.tasks) ? data.tasks : [];
        console.log('✅ Setting stages:', stagesArray.length, 'and tasks:', tasksArray.length);
        setStages(stagesArray);
        setTasks(tasksArray);

        if (data.stages && data.stages.length > 0) {
          const currentStage = data.stages.find(s => s.status === 'active');
          if (currentStage) {
            setExpandedStages(new Set([currentStage.id]));
          }
        }
      } else {
        const errorData = await planRes.json().catch(() => ({ error: planRes.statusText }));
        throw new Error(errorData.error || `Failed to load plan: ${planRes.status}`);
      }

      if (notesRes.ok) {
        const notesData = await notesRes.json();
        if (notesData.success && notesData.data) {
          setSharedNotes(Array.isArray(notesData.data) ? notesData.data : []);
        } else if (Array.isArray(notesData)) {
          setSharedNotes(notesData);
        } else {
          setSharedNotes([]);
        }
      } else {
        const errorText = await notesRes.text();
        console.error('Failed to fetch notes:', notesRes.status, errorText);
        setSharedNotes([]);
      }

      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        if (messagesData.success && messagesData.data) {
          setMessages(Array.isArray(messagesData.data) ? messagesData.data : []);
        } else if (Array.isArray(messagesData)) {
          setMessages(messagesData);
        } else {
          setMessages([]);
        }
      } else {
        setMessages([]);
      }

      if (contactsRes.ok) {
        const contactsData = await contactsRes.json();
        if (contactsData.success && contactsData.data) {
          setContacts(Array.isArray(contactsData.data) ? contactsData.data : []);
        } else if (Array.isArray(contactsData)) {
          setContacts(contactsData);
        } else {
          setContacts([]);
        }
      } else {
        setContacts([]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch plan:', error);
      setLoading(false);
    }
  };

  const handleAddNote = async (visibility = 'shared') => {
    if (!newNote.trim()) return;

    try {
      const res = await fetch(`/api/plans/${plan.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote, visibility })
      });

      if (res.ok) {
        const response = await res.json();
        const note = response.data || response;
        setSharedNotes([...sharedNotes, note]);
        setNewNote('');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      setErrorMessage('Failed to add note');
    }
  };

  const handleAddStageNote = async (stageId) => {
    const content = stageNoteInput[stageId] || '';
    if (!content.trim()) return;

    try {
      const res = await fetch(`/api/plans/${plan.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, visibility: 'shared', stageId })
      });

      if (res.ok) {
        const response = await res.json();
        const note = response.data || response;
        setStageNotes({
          ...stageNotes,
          [stageId]: [...(stageNotes[stageId] || []), note]
        });
        setStageNoteInput({ ...stageNoteInput, [stageId]: '' });
      }
    } catch (error) {
      console.error('Failed to add stage note:', error);
      setErrorMessage('Failed to add note');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      const res = await fetch(`/api/plans/${plan.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (res.ok) {
        const response = await res.json();
        const message = response.data || response;
        setMessages([...messages, message]);
        setNewMessage('');
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setErrorMessage('Failed to send message');
    }
  };

  const handleMarkComplete = async (taskId, newStatus = 'complete') => {
    const originalTask = tasks.find(t => t.id === taskId);
    const updatedTasks = tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
    setTasks(updatedTasks);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/plans/${plan.id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, assignedTo: originalTask?.assigned_to })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || 'Failed to update task');
      }

      const data = await res.json();
      console.log('Task updated successfully:', data);
    } catch (error) {
      console.error('Failed to update task:', error.message);
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: originalTask.status } : t));
      setErrorMessage('Failed to update task: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleMarkBlocked = async () => {
    if (!blockingTask || !blockReason.trim()) return;

    const originalTask = tasks.find(t => t.id === blockingTask.id);
    const updatedTasks = tasks.map(t => t.id === blockingTask.id ? { ...t, status: 'blocked', blocked_reason: blockReason } : t);
    setTasks(updatedTasks);
    setErrorMessage('');

    try {
      const res = await fetch(`/api/plans/${plan.id}/tasks/${blockingTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'blocked', blockedReason: blockReason })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || 'Failed to mark task as blocked');
      }

      const data = await res.json();
      console.log('Task blocked successfully:', data);

      setShowBlockModal(false);
      setBlockingTask(null);
      setBlockReason('');
    } catch (error) {
      console.error('Failed to mark task as blocked:', error.message);
      setTasks(tasks.map(t => t.id === blockingTask.id ? { ...t, status: originalTask.status, blocked_reason: originalTask.blocked_reason } : t));
      setErrorMessage('Failed to update task: ' + (error.message || 'Unknown error'));
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const toggleStage = (stageId) => {
    const newExpanded = new Set(expandedStages);
    if (newExpanded.has(stageId)) {
      newExpanded.delete(stageId);
    } else {
      newExpanded.add(stageId);
    }
    setExpandedStages(newExpanded);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/csm-session', { method: 'POST' });
    } catch (error) {
      console.error('Logout error:', error);
    }
    router.push('/csm-login');
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.email) {
      setErrorMessage('Please fill in name and email');
      return;
    }

    try {
      const res = await fetch(`/api/plans/${plan.id}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact)
      });

      if (res.ok) {
        const response = await res.json();
        const contact = response.data || response;
        setContacts([...contacts, contact]);
        setNewContact({ name: '', email: '', phone_number: '' });
        setShowAddContact(false);
        setErrorMessage('');
      } else {
        setErrorMessage('Failed to add contact');
      }
    } catch (error) {
      console.error('Failed to add contact:', error);
      setErrorMessage('Failed to add contact');
    }
  };

  const getStageStatus = (stage) => {
    const stageTasks = tasks.filter(t => t.stage_id === stage.id);
    if (!stageTasks.length) return 'pending';
    const allComplete = stageTasks.every(t => t.status === 'completed');
      if (allComplete) return 'complete';
      const someComplete = stageTasks.some(t => t.status === 'completed');
    return someComplete ? 'in-progress' : 'pending';
  };

  const getCurrentStage = () => {
    return stages.find(s => getStageStatus(s) !== 'complete') || stages[stages.length - 1];
  };

  const currentStage = getCurrentStage();
  const overallCompletion = tasks.length > 0 ? Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100) : 0;
  const blockedTasks = tasks.filter(t => t.status === 'blocked');

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-600">Plan not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header 
        currentPage="plan-details" 
        profile={user}
        backButton={{
          label: 'Dashboard',
          onClick: () => router.push('/')
        }}
        pageTitle={plan?.company_name}
      />

      <div className="flex-1 mb-12">
        <div className="max-w-5xl mx-auto p-6">
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-gray-200 text-gray-900 rounded hover:bg-gray-300 transition text-sm font-medium"
            >
              Back
            </button>
            <button
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center gap-2"
            >
              <Plus size={16} />
              Add Task
            </button>
            <button
              onClick={() => router.push('/messages')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center gap-2"
            >
              <MessageSquare size={16} />
              Message
            </button>
          </div>

          {template && template.stages && template.stages.length > 0 && (
            <div className="mb-8">
              <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-blue-900">{plan.customer_name || plan.company_name}</h2>
                    <p className="text-sm text-blue-700 mt-2">{template.name}</p>
                  </div>
                  {template.estimated_duration_days && (
                    <div className="text-right bg-white rounded-lg p-3">
                      <p className="text-xs font-medium text-blue-600 uppercase">Estimated Duration</p>
                      <p className="text-lg font-bold text-blue-900 mt-1">{template.estimated_duration_days} days</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex justify-between items-center">
              <span>{errorMessage}</span>
              {errorMessage.includes('Session') && (
                <button
                  onClick={() => router.push('/csm-login')}
                  className="ml-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-medium"
                >
                  Go to Login
                </button>
              )}
            </div>
          )}

          {blockedTasks.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900">{blockedTasks.length} task(s) blocked</p>
                <p className="text-sm text-red-700 mt-1">Resolve blocked tasks to keep the plan on track</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="col-span-2">
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-semibold text-gray-900">{overallCompletion}%</span>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-3">
                  <div
                    className="h-3 rounded-full transition-all duration-300"
                    style={{
                      width: `${overallCompletion}%`,
                      backgroundColor: overallCompletion === 100 ? '#16a34a' : '#2563eb'
                    }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  <span className="font-semibold text-gray-900">{tasks.filter(t => t.status === 'completed').length} of {tasks.length}</span> tasks completed
                </p>
              </div>

              <div className="space-y-4">
                {stages.length > 0 && console.log('📊 Rendering stages:', stages.length, 'with tasks:', tasks.length, 'first task stage_id:', tasks[0]?.stage_id, 'first stage id:', stages[0]?.id)}
                {stages.map((stage, stageIdx) => {
                  const stageTasks = tasks.filter(t => Number(t.stage_id) === Number(stage.id));
                  const stageStatus = getStageStatus(stage);
                  const isExpanded = expandedStages.has(stage.id);
                  const isCurrent = stage.id === currentStage?.id;
                  const stageComplete = stageStatus === 'complete';

                  return (
                    <div key={stage.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleStage(stage.id)}
                        className={`w-full p-4 flex justify-between items-center transition ${stageComplete ? 'bg-green-50 hover:bg-green-100' : isCurrent ? 'bg-blue-50 hover:bg-blue-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div className="flex items-center gap-4 text-left">
                          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${stageComplete ? 'bg-green-600 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-700'}`}>
                            {stageComplete ? <Check size={16} /> : stageIdx + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{stage.name}</h3>
                            {stage.description && (
                              <p className="text-sm text-gray-600 mt-0.5">{stage.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {stageComplete && (
                            <span className="text-xs font-medium text-green-700 px-2 py-1 bg-green-100 rounded">Completed</span>
                          )}
                          {isCurrent && !stageComplete && (
                            <span className="text-xs font-medium text-blue-700 px-2 py-1 bg-blue-100 rounded">Current</span>
                          )}
                          <ChevronDown
                            size={20}
                            className={`text-gray-600 transition ${isExpanded ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="bg-white border-t border-gray-200 divide-y divide-gray-200">
                          {stageTasks.length > 0 ? (
                            stageTasks.map((task) => (
                              <div
                                key={task.id}
                                className={`p-5 transition ${task.status === 'completed' ? 'bg-gray-50' : task.status === 'blocked' ? 'bg-red-50' : 'bg-white'}`}
                              >
                                <div className="flex justify-between items-start gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3">
                                      <p className={`font-bold ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                        {task.title}
                                      </p>
                                      {task.status === 'completed' && (
                                        <Check size={20} className="text-green-600 flex-shrink-0" />
                                      )}
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1">{task.description}</p>

                                    {task.status === 'blocked' && task.blocked_reason && (
                                      <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded">
                                        <p className="text-sm text-red-700 font-medium">Blocked: {task.blocked_reason}</p>
                                      </div>
                                    )}

                                    <div className="flex gap-2 mt-3">
                                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${task.assigned_to === 'customer' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {task.assigned_to === 'customer' ? 'Customer' : 'Team'}
                                      </span>
                                      <span className={`inline-block text-xs font-medium px-2 py-1 rounded ${task.status === 'completed' ? 'bg-green-100 text-green-700' : task.status === 'blocked' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                        {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex-shrink-0 flex gap-2">
                                    {task.status === 'completed' ? (
                                      <>
                                        <button
                                          onClick={() => handleMarkComplete(task.id, 'pending')}
                                          className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 transition"
                                          title="Undo - return to pending"
                                        >
                                          Undo
                                        </button>
                                        <button
                                          onClick={() => {
                                            setBlockingTask(task);
                                            setShowBlockModal(true);
                                          }}
                                          className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                                        >
                                          Block
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {task.assigned_to === 'customer' && task.status === 'pending' && (
                                          <button
                                            onClick={() => handleMarkComplete(task.id, 'pending')}
                                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                                            title="Send magic link to customer"
                                          >
                                            Send Link
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleMarkComplete(task.id, 'completed')}
                                          className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                                        >
                                          Complete
                                        </button>
                                        {task.status !== 'blocked' && (
                                          <button
                                            onClick={() => {
                                              setBlockingTask(task);
                                              setShowBlockModal(true);
                                            }}
                                            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                                          >
                                            Block
                                          </button>
                                        )}
                                        {task.status === 'blocked' && (
                                          <button
                                            onClick={() => handleMarkComplete(task.id, 'pending')}
                                            className="px-3 py-1 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 transition"
                                            title="Undo - return to pending"
                                          >
                                            Undo
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-5 text-center text-gray-600">
                              No tasks in this stage
                            </div>
                          )}
                          {isExpanded && (
                            <div className="bg-blue-50 border-t border-gray-200 p-4">
                              <h4 className="text-sm font-semibold text-gray-900 mb-3">Stage Notes</h4>
                              <div className="space-y-2 mb-3">
                                {(stageNotes[stage.id] || []).map((note) => (
                                  <div key={note.id} className="text-sm bg-white p-2 rounded border border-blue-200">
                                    <p className="text-xs font-medium text-blue-700 mb-1">{note.first_name} {note.last_name}</p>
                                    <p className="text-gray-900">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={stageNoteInput[stage.id] || ''}
                                  onChange={(e) => setStageNoteInput({ ...stageNoteInput, [stage.id]: e.target.value })}
                                  placeholder="Add stage note..."
                                  className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddStageNote(stage.id)}
                                />
                                <button
                                  onClick={() => handleAddStageNote(stage.id)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition"
                                >
                                  <Plus size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Contacts</h3>
                <div className="space-y-3 mb-4">
                  {contacts.length === 0 ? (
                    <p className="text-sm text-gray-500">No contacts added yet</p>
                  ) : (
                    contacts.map((contact) => (
                      <div key={contact.id} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="font-medium text-gray-900">{contact.name}</p>
                        <p className="text-gray-600 text-xs mt-1">{contact.email}</p>
                        {contact.phone_number && (
                          <p className="text-gray-600 text-xs mt-1">{contact.phone_number}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
                {!showAddContact ? (
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Contact
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newContact.name}
                      onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="Email"
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={newContact.phone_number}
                      onChange={(e) => setNewContact({ ...newContact, phone_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddContact}
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setShowAddContact(false);
                          setNewContact({ name: '', email: '', phone_number: '' });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-gray-700 text-sm hover:bg-gray-50 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Internal Notes</h3>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {sharedNotes && Array.isArray(sharedNotes) && sharedNotes.filter(n => n.visibility === 'internal').map((note) => (
                    <div key={note.id} className="text-sm bg-gray-50 p-3 rounded border border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">{note.first_name} {note.last_name}</p>
                      <p className="text-gray-900">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add internal note..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNote('internal')}
                  />
                  <button
                    onClick={() => handleAddNote('internal')}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Shared Notes</h3>
                <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
                  {sharedNotes && Array.isArray(sharedNotes) && sharedNotes.filter(n => n.visibility === 'shared').map((note) => (
                    <div key={note.id} className="text-sm bg-green-50 p-3 rounded border border-green-200">
                      <p className="text-xs font-medium text-green-700 mb-1">{note.first_name} {note.last_name}</p>
                      <p className="text-gray-900">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add shared note..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddNote('shared')}
                  />
                  <button
                    onClick={() => handleAddNote('shared')}
                    className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{plan.customer_name || 'Customer Profile'}</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-600 hover:text-gray-900 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              {/* Profile Header */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Company Information</h3>
                <p className="text-sm text-gray-700"><span className="font-medium">Company:</span> {plan.company_name}</p>
                <p className="text-sm text-gray-700 mt-1"><span className="font-medium">Customer:</span> {plan.customer_name}</p>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-4 mb-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-4 py-2 font-medium transition ${
                    activeTab === 'messages'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Messages ({messages.length})
                </button>
                <button
                  onClick={() => setActiveTab('contacts')}
                  className={`px-4 py-2 font-medium transition ${
                    activeTab === 'contacts'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Contacts ({contacts.length})
                </button>
              </div>

              {/* Messages Tab */}
              {activeTab === 'messages' && (
                <div>
                  <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No messages yet. Start a conversation.</p>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className={`p-3 rounded-lg ${
                          message.sender_type === 'csm'
                            ? 'bg-blue-50 border border-blue-200 ml-8'
                            : 'bg-gray-100 border border-gray-200 mr-8'
                        }`}>
                          <p className="text-xs font-medium text-gray-700 mb-1">
                            {message.sender_type === 'csm' ? 'You' : 'Customer'}
                          </p>
                          <p className="text-sm text-gray-900">{message.content}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  <button
                    onClick={() => {
                      handleSendMessage();
                      setNewMessage('');
                    }}
                    className="w-full mt-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium"
                  >
                    Send Message
                  </button>
                </div>
              )}

              {/* Contacts Tab */}
              {activeTab === 'contacts' && (
                <div>
                  <div className="space-y-2 mb-4">
                    {contacts.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-8">No contacts added yet.</p>
                    ) : (
                      contacts.map((contact) => (
                        <div key={contact.id} className="p-3 bg-gray-50 border border-gray-200 rounded">
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-sm text-gray-600 mt-1">{contact.email}</p>
                          {contact.phone_number && (
                            <p className="text-sm text-gray-600">{contact.phone_number}</p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Plus size={16} />
                    Add Contact
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showBlockModal && blockingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Block Task</h3>
            <p className="text-sm text-gray-600 mb-4">Why is this task blocked?</p>
            <textarea
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              placeholder="Provide a reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-red-500 mb-4"
              rows={4}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBlockModal(false);
                  setBlockingTask(null);
                  setBlockReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkBlocked}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                Block Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
