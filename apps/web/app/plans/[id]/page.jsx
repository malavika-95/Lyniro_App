'use client';

import { useState, useEffect, Suspense } from 'react';
import { Trash2, Plus, AlertCircle } from 'lucide-react';

function PlanContent({ planId }) {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Notes state
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('internal');
  const [savingNote, setSavingNote] = useState(false);

  // Contacts state
  const [contacts, setContacts] = useState([]);
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone_number: '' });
  const [savingContact, setSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');

  // Task update state
  const [updatingTask, setUpdatingTask] = useState(null);

  // === REPLACE ALL TASK HANDLERS WITH THIS EXACT CODE ===
  const refreshPlan = async () => {
    try {
      const res = await fetch(`/api/plans/${planId}`, { cache: 'no-store' });
      const result = await res.json();
      const freshPlan = result.success ? (result.data || result) : result;
      if (freshPlan && (freshPlan.id || freshPlan.tasks)) {
        setPlan(freshPlan);
      }
    } catch (err) {
      console.error('refreshPlan error', err);
    }
  };

  const handleTaskUpdate = async (taskId, updateData) => {
    try {
      const res = await fetch(`/api/plans/${planId}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });
      const result = await res.json();
      if (result.success) {
        await refreshPlan();
      } else {
        alert(result.error || 'Failed to update task');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = (taskId) => handleTaskUpdate(taskId, { status: 'completed' });
  const handleUndo = (taskId) => handleTaskUpdate(taskId, { status: 'pending' });
  const handleBlock = (taskId) => {
    const reason = prompt('Why is this task blocked?');
    if (reason) handleTaskUpdate(taskId, { status: 'blocked', blockedReason: reason });
  };

  // Load all data on mount
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [planRes, notesRes, contactsRes] = await Promise.all([
          fetch(`/api/plans/${planId}`),
          fetch(`/api/plans/${planId}/notes`),
          fetch(`/api/plans/${planId}/contacts`)
        ]);

        // Parse plan
        if (!planRes.ok) {
          const data = await planRes.json();
          throw new Error(data.error || 'Failed to load plan');
        }
        const planData = await planRes.json();
        if (planData.error) {
          throw new Error(planData.error);
        }
        const finalPlan = planData.success ? (planData.data || planData) : planData;
        console.log('📋 [Plan Page] Loaded plan:', finalPlan._debug, 'Full plan:', finalPlan);
        setPlan(finalPlan);

        // Parse notes
        if (notesRes.ok) {
          const notesData = await notesRes.json();
          const finalNotes = notesData.success ? (notesData.data || []) : (Array.isArray(notesData) ? notesData : notesData.data || []);
          setNotes(finalNotes);
        }

        // Parse contacts
        if (contactsRes.ok) {
          const contactsData = await contactsRes.json();
          const finalContacts = contactsData.success ? (contactsData.data || []) : (Array.isArray(contactsData) ? contactsData : contactsData.data || []);
          setContacts(finalContacts);
        }
      } catch (err) {
        console.error('Error loading plan:', err);
        setError(err.message || 'Failed to load plan data');
      } finally {
        setLoading(false);
      }
    };

    if (planId) {
      loadAllData();
    }
  }, [planId]);

  // Add note
  const handleAddNote = async () => {
    if (!noteInput.trim() || savingNote) return;

    setSavingNote(true);
    try {
      const response = await fetch(`/api/plans/${planId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: noteInput,
          visibility: noteVisibility
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add note');
      }

      setNoteInput('');
      setNoteVisibility('internal');

      // Refresh notes
      const updated = await fetch(`/api/plans/${planId}/notes`).then(r => r.json());
      const finalNotes = updated.success ? (updated.data || []) : (Array.isArray(updated) ? updated : updated.data || []);
      setNotes(finalNotes);
    } catch (err) {
      console.error('Add note error:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setSavingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      const response = await fetch(`/api/plans/${planId}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      setNotes(notes.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Delete note error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Validate email format
  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Validate phone (minimum 10 digits)
  const isValidPhone = (phone) => {
    if (!phone.trim()) return true;
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 10;
  };

  // Add contact
  const handleAddContact = async () => {
    setContactError('');

    // Validate inputs
    if (!contactForm.name.trim()) {
      setContactError('Name is required');
      return;
    }

    if (!contactForm.email.trim()) {
      setContactError('Email is required');
      return;
    }

    if (!isValidEmail(contactForm.email)) {
      setContactError('Please enter a valid email address');
      return;
    }

    if (contactForm.phone_number && !isValidPhone(contactForm.phone_number)) {
      setContactError('Phone number must contain at least 10 digits');
      return;
    }

    setSavingContact(true);
    try {
      const response = await fetch(`/api/plans/${planId}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add contact');
      }

      setContactForm({ name: '', email: '', phone_number: '' });

      // Refresh contacts
      const updated = await fetch(`/api/plans/${planId}/contacts`).then(r => r.json());
      const finalContacts = updated.success ? (updated.data || []) : (Array.isArray(updated) ? updated : updated.data || []);
      setContacts(finalContacts);
    } catch (err) {
      console.error('Add contact error:', err);
      setContactError(err.message);
    } finally {
      setSavingContact(false);
    }
  };

  // Delete contact
  const handleDeleteContact = async (contactId) => {
    try {
      const response = await fetch(`/api/plans/${planId}/contacts`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactId })
      });

      if (!response.ok) {
        throw new Error('Failed to delete contact');
      }

      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (err) {
      console.error('Delete contact error:', err);
      alert(`Error: ${err.message}`);
    }
  };

  // Add custom task
  const handleAddCustomTask = async () => {
    const title = prompt('Enter task title:');
    if (!title || !title.trim()) return;

    try {
      const response = await fetch(`/api/plans/${planId}/custom-tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add task');
      }

      // Refresh plan data
      const updatedPlan = await fetch(`/api/plans/${planId}`).then(r => r.json());
      const finalPlan = updatedPlan.success ? (updatedPlan.data || updatedPlan) : updatedPlan;
      if (finalPlan && !finalPlan.error) {
        setPlan(finalPlan);
      }
    } catch (err) {
      console.error('Add task error:', err);
      alert(`Error: ${err.message}`);
    }
  };



  // Get status badge color
  const getStatusColor = (status) => {
    const statusColors = {
      pending: 'bg-gray-100 text-gray-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      blocked: 'bg-red-100 text-red-800'
    };
    return statusColors[status] || statusColors.pending;
  };

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="h-2.5 bg-gray-200 rounded-full w-full mb-4"></div>
            <div className="flex gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-6 bg-gray-200 rounded w-20"></div>
              ))}
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className=\"bg-white rounded-lg border border-gray-200 h-32\"></div>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error || !plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <p>{error || 'Plan not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const stages = plan.stages || [];
  const allTasks = plan.tasks || [];

  // DEBUG
  console.log('Plan loaded:', { 
    stages: stages.length, 
    tasks: allTasks.length,
    firstTask: allTasks[0],
    firstStage: stages[0]
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Plan info */}
          <h1 className="text-3xl font-bold text-gray-900 mb-1">{plan.customer_name || 'Untitled Plan'}</h1>
          <p className="text-gray-600 mb-4">{plan.company_name || ''}</p>

          {/* Progress bar */}
          {(() => {
            const total = allTasks.length;
            const done = allTasks.filter(t => t.status === 'completed').length;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                  <span className="text-sm font-bold text-gray-900">{done}/{total} tasks · {pct}%</span>
                </div>
                <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()}

          {/* Tab navigation */}
          <div className="flex gap-6 border-b border-gray-200">
            {['overview', 'notes', 'contacts'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-1 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Add Task Button */}
            <button
              onClick={handleAddCustomTask}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition"
            >
              <Plus size={16} />
              Add Task
            </button>

            {stages.length > 0 ? (
              stages.map(stage => {
                const stageTasks = allTasks.filter(t => Number(t.stage_id) === Number(stage.id));
                return (
                  <div
                    key={stage.id}
                    className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                  >
                    {/* Stage header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h2 className="font-semibold text-gray-900">{stage.name}</h2>
                      {stage.description && (
                        <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                      )}
                    </div>

                    {/* Tasks */}
                    <div className="divide-y divide-gray-200">
                      {stageTasks.length > 0 ? (
                        stageTasks.map(task => (
                          <div key={task.id} className="p-6 hover:bg-gray-50 transition">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h3 className="font-medium text-gray-900 mb-2">{task.title}</h3>
                                {task.description && (
                                  <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                )}

                                {/* Task metadata */}
                                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                  {task.assigned_to && (
                                    <div>
                                      <span className="font-medium">Assigned to:</span> {task.assigned_to}
                                    </div>
                                  )}
                                  {task.due_day && (
                                    <div>
                                      <span className="font-medium">Due day:</span> {task.due_day}
                                    </div>
                                  )}
                                  {task.priority && (
                                    <div>
                                      <span className="font-medium">Priority:</span>{' '}
                                      <span
                                        className={
                                          task.priority === 'high'
                                            ? 'text-red-600'
                                            : task.priority === 'medium'
                                            ? 'text-yellow-600'
                                            : 'text-green-600'
                                        }
                                      >
                                        {task.priority}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Status controls */}
                              {task.status === 'completed' ? (
                                <button onClick={() => handleUndo(task.id)} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg">Undo</button>
                              ) : task.status === 'blocked' ? (
                                <button onClick={() => handleUndo(task.id)} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg">Undo</button>
                              ) : (
                                <div className="flex gap-2">
                                  <button onClick={() => handleComplete(task.id)} className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg">Complete</button>
                                  <button onClick={() => handleBlock(task.id)} className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg">Block</button>
                                </div>
                              )}
                            </div>

                            {/* Blocked reason display */}
                            {task.status === 'blocked' && task.blocked_reason && (
                              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                <span className="font-medium">Blocked reason:</span> {task.blocked_reason}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500 text-sm">
                          No tasks in this stage
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                No stages found in this plan
              </div>
            )}
          </div>
        )}

        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            {/* Notes list */}
            {notes.length > 0 ? (
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex justify-between items-start gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {note.first_name} {note.last_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(note.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-xs font-medium px-2 py-1 rounded ${
                            note.visibility === 'internal'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {note.visibility === 'internal' ? 'Internal' : 'Shared'}
                        </span>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                No notes yet
              </div>
            )}

            {/* Add note form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add Note</h3>
              <textarea
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="Write a note..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-600"
                rows="3"
              />

              <div className="flex items-center gap-6 mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="internal"
                    checked={noteVisibility === 'internal'}
                    onChange={(e) => setNoteVisibility(e.target.value)}
                  />
                  Internal
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="visibility"
                    value="shared"
                    checked={noteVisibility === 'shared'}
                    onChange={(e) => setNoteVisibility(e.target.value)}
                  />
                  Share with customer
                </label>
              </div>

              <button
                onClick={handleAddNote}
                disabled={savingNote || !noteInput.trim()}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50"
              >
                Add Note
              </button>
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="space-y-6">
            {/* Contacts list */}
            {contacts.length > 0 ? (
              <div className="space-y-3">
                {contacts.map(contact => (
                  <div
                    key={contact.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 flex justify-between items-start"
                  >
                    <div>
                      <h4 className="font-medium text-gray-900">{contact.name}</h4>
                      <p className="text-sm text-gray-600">{contact.email}</p>
                      {contact.phone_number && (
                        <p className="text-sm text-gray-600">{contact.phone_number}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteContact(contact.id)}
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                No contacts yet
              </div>
            )}

            {/* Add contact form */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Add Contact</h3>

              {contactError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                  {contactError}
                </div>
              )}

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <input
                  type="email"
                  placeholder="Email address"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <input
                  type="tel"
                  placeholder="Phone number (optional)"
                  value={contactForm.phone_number}
                  onChange={(e) => setContactForm({ ...contactForm, phone_number: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                />

                <button
                  onClick={handleAddContact}
                  disabled={savingContact || !contactForm.name.trim() || !contactForm.email.trim()}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus size={16} />
                  Add Contact
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default async function PlanPage({ params }) {
  const { id } = await params;
  
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><p>Loading...</p></div>}>
      <PlanContent planId={id} />
    </Suspense>
  );
}
