'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock, AlertCircle, MessageSquare, LogOut, Loader } from 'lucide-react';

export default function CustomerPortal() {
  const router = useRouter();
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const sessionRes = await fetch('/api/auth/customer-session');
      
      if (!sessionRes.ok) {
        router.push('/customer-login');
        return;
      }

      const session = await sessionRes.json();
      setUser(session);

      // Fetch plan
      const planRes = await fetch(`/api/plans/${session.plan_id}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData);
        setTasks(planData.tasks || []);
      }

      // Fetch messages
      const messagesRes = await fetch(`/api/plans/${session.plan_id}/messages`);
      if (messagesRes.ok) {
        const messagesData = await messagesRes.json();
        setMessages(messagesData.data || []);
      }

      // Fetch company settings
      const companyRes = await fetch('/api/settings/company');
      if (companyRes.ok) {
        const companyData = await companyRes.json();
        setCompany(companyData.data || companyData);
      }

      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to load your onboarding plan');
      setLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const res = await fetch(`/api/plans/${plan.id}/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'complete' })
      });

      if (res.ok) {
        setTasks(tasks.map(t => 
          t.id === taskId ? { ...t, status: 'complete' } : t
        ));
      }
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const res = await fetch(`/api/plans/${plan.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setMessages([...messages, newMsg.data]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/customer-session', { method: 'DELETE' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    router.push('/customer-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading your onboarding plan...</p>
        </div>
      </div>
    );
  }

  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {company?.company_logo_url ? (
              <img src={company.company_logo_url} alt="Company" className="h-8 w-auto" />
            ) : (
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: company?.brand_color || '#3b82f6' }}
              >
                {company?.company_name?.[0] || 'O'}
              </div>
            )}
            <h1 className="text-lg font-semibold text-slate-900">{company?.company_name || 'Onboarding'}</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm hidden sm:block">
              <p className="font-medium text-slate-900">{user?.email}</p>
            </div>
            <button 
              onClick={handleLogout}
              className="text-slate-600 hover:text-slate-900 transition p-2 rounded hover:bg-slate-100"
              title="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex gap-2">
            <AlertCircle size={18} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Welcome Section */}
        {plan && (
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">{plan.customer_name}</h2>
            <p className="text-slate-600">Get ready to launch. Complete all tasks below to go live.</p>
          </div>
        )}

        {/* Progress Overview */}
        <div className="bg-white rounded-lg border border-slate-200 p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-900">Progress</h3>
            <span className="text-sm font-medium text-slate-600">{completedTasks} of {totalTasks}</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3">
            <div
              className="h-3 rounded-full transition-all duration-300"
              style={{ 
                width: `${progressPercent}%`,
                backgroundColor: company?.brand_color || '#3b82f6'
              }}
            />
          </div>
          <p className="text-sm text-slate-600 mt-3">{progressPercent}% complete</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Tasks Column */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Clock size={18} />
                  Tasks
                </h3>
              </div>

              <div className="divide-y divide-slate-200">
                {tasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-600">
                    <p>No tasks yet. Check back soon!</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`p-4 flex items-start gap-4 transition ${task.status === 'completed' ? 'bg-green-50' : ''}`}
                      >
                      {task.status === 'completed' ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check size={14} className="text-white" />
                        </div>
                      ) : task.status === 'blocked' ? (
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <AlertCircle size={14} className="text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex-shrink-0 mt-0.5" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.status === 'completed' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-slate-600 mt-1">{task.description}</p>
                        )}
                        {task.assigned_to && (
                          <p className="text-xs text-slate-500 mt-2">Assigned to: {task.assigned_to}</p>
                        )}
                        {task.status === 'blocked' && task.blocked_reason && (
                          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                            <p className="font-medium">Blocked</p>
                            <p>{task.blocked_reason}</p>
                          </div>
                        )}
                      </div>

                      {task.status === 'completed' ? (
                        <span className="text-xs font-medium text-green-700 px-2 py-1 bg-green-100 rounded flex-shrink-0">
                          Done
                        </span>
                      ) : task.status === 'blocked' ? (
                        <span className="text-xs font-medium text-red-700 px-2 py-1 bg-red-100 rounded flex-shrink-0">
                          Blocked
                        </span>
                      ) : (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="text-xs font-medium px-3 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition flex-shrink-0"
                        >
                          Mark done
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Messages Column */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="p-6 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <MessageSquare size={18} />
                  Messages
                </h3>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '400px' }}>
                {messages.length === 0 ? (
                  <p className="text-sm text-slate-600 text-center py-8">No messages yet</p>
                ) : (
                  messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`p-3 rounded-lg text-sm ${msg.sender_type === 'customer' ? 'bg-blue-50 text-slate-900 ml-4' : 'bg-slate-100 text-slate-900'}`}
                    >
                      <p className="text-xs text-slate-600 mb-1 font-medium">
                        {msg.sender_type === 'customer' ? 'You' : 'Team'}
                      </p>
                      <p>{msg.content}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Send a message..."
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="w-full mt-2 px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition"
                >
                  {sendingMessage ? 'Sending...' : 'Send'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
