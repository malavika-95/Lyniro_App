'use client';

import { useState, useEffect } from 'react';
import { Send, ChevronDown, MessageCircle } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Header from '@/components/header';

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState('available');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [notes, setNotes] = useState([]);
  const [noteInput, setNoteInput] = useState('');
  const [noteVisibility, setNoteVisibility] = useState('internal');
  const [sendingNote, setSendingNote] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    fetchConversations();
    fetchAvailabilityStatus();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      const planIdFromUrl = searchParams.get('planId');
      if (planIdFromUrl) {
        const plan = conversations.find(c => c.id === parseInt(planIdFromUrl));
        if (plan) {
          setSelectedPlan(plan);
        }
      } else if (!selectedPlan) {
        setSelectedPlan(conversations[0]);
      }
    }
  }, [conversations, searchParams]);

  useEffect(() => {
    if (selectedPlan) {
      fetchMessages(selectedPlan.id);
      fetchNotes(selectedPlan.id);
      const interval = setInterval(() => {
        fetchMessages(selectedPlan.id);
        if (activeTab === 'notes') {
          fetchNotes(selectedPlan.id);
        }
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [selectedPlan, activeTab]);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/settings/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const response = await res.json();
        const plansData = response.data || response;
        setConversations(Array.isArray(plansData) ? plansData : []);
        if (!selectedPlan && Array.isArray(plansData) && plansData.length > 0) {
          setSelectedPlan(plansData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (planId) => {
    try {
      const res = await fetch(`/api/plans/${planId}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setMessages(Array.isArray(data.data) ? data.data : []);
        } else if (Array.isArray(data)) {
          setMessages(data);
        } else {
          setMessages([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const fetchNotes = async (planId) => {
    try {
      const res = await fetch(`/api/plans/${planId}/notes`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setNotes(Array.isArray(data.data) ? data.data : []);
        } else if (Array.isArray(data)) {
          setNotes(data);
        } else {
          setNotes([]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim() || !selectedPlan) return;

    setSendingNote(true);
    try {
      const res = await fetch(`/api/plans/${selectedPlan.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content: noteInput,
          visibility: noteVisibility
        })
      });

      if (res.ok) {
        setNoteInput('');
        await fetchNotes(selectedPlan.id);
      }
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setSendingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!selectedPlan) return;

    try {
      const res = await fetch(`/api/plans/${selectedPlan.id}/notes`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteId })
      });

      if (res.ok) {
        await fetchNotes(selectedPlan.id);
      }
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const fetchAvailabilityStatus = async () => {
    try {
      const res = await fetch('/api/csm/availability-status');
      if (res.ok) {
        const data = await res.json();
        setAvailabilityStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  const updateAvailabilityStatus = async (status) => {
    try {
      const res = await fetch('/api/csm/availability-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const data = await res.json();
        setAvailabilityStatus(data.status);
        setShowStatusDropdown(false);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const sendMessage = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!messageInput.trim() || !selectedPlan) return;

      setSendingMessage(true);
      try {
        const res = await fetch(`/api/plans/${selectedPlan.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: messageInput })
        });

        if (res.ok) {
          setMessageInput('');
          await fetchMessages(selectedPlan.id);
          await fetchConversations();
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setSendingMessage(false);
      }
    }
  };

  const handleSendButtonClick = async () => {
    if (!messageInput.trim() || !selectedPlan) return;

    setSendingMessage(true);
    try {
      const res = await fetch(`/api/plans/${selectedPlan.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageInput })
      });

      if (res.ok) {
        setMessageInput('');
        await fetchMessages(selectedPlan.id);
        await fetchConversations();
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header currentPage="messages" profile={profile} unreadMessageCount={0} notifications={[]} />

      {/* Main Content */}
      <div className="flex-1">
        <div className="h-full flex">
          {/* Conversations List */}
          <div className="w-80 border-r border-gray-200 overflow-y-auto bg-gray-50">
            {loading ? (
              <div className="p-6 text-gray-500">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-gray-500 text-center">
                <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                <p>No conversations yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedPlan(conv)}
                    className={`w-full p-4 text-left hover:bg-gray-100 transition border-l-4 ${
                      selectedPlan?.id === conv.id
                        ? 'bg-blue-50 border-blue-600'
                        : 'border-transparent hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <p className={`font-medium ${conv.has_unread ? 'font-bold text-gray-900' : 'text-gray-900'}`}>
                        {conv.customer_name}
                      </p>
                      {conv.unread_count > 0 && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">{conv.unread_count}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{conv.company_name}</p>
                    <p className="text-sm text-gray-600 truncate">{conv.last_message}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(conv.last_message_time)}</p>
                    {conv.has_unread && <div className="w-2 h-2 rounded-full bg-blue-600 mt-2" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chat Window */}
          <div className="flex-1 flex flex-col">
            {selectedPlan ? (
              <>
                {/* Chat Header */}
                <div className="border-b border-gray-200 bg-white p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">{selectedPlan.customer_name}</h2>
                      <p className="text-sm text-gray-600 mt-1">{selectedPlan.company_name}</p>
                    </div>
                  </div>
                  {/* Tabs */}
                  <div className="flex gap-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('chat')}
                      className={`px-4 py-2 font-medium text-sm transition border-b-2 ${
                        activeTab === 'chat'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-gray-600 border-transparent hover:text-gray-900'
                      }`}
                    >
                      Chat
                    </button>
                    <button
                      onClick={() => setActiveTab('notes')}
                      className={`px-4 py-2 font-medium text-sm transition border-b-2 ${
                        activeTab === 'notes'
                          ? 'text-blue-600 border-blue-600'
                          : 'text-gray-600 border-transparent hover:text-gray-900'
                      }`}
                    >
                      Notes
                    </button>
                    {profile?.role === 'Owner' && (
                      <button
                        onClick={() => setActiveTab('admin')}
                        className={`px-4 py-2 font-medium text-sm transition border-b-2 ${
                          activeTab === 'admin'
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-600 border-transparent hover:text-gray-900'
                        }`}
                      >
                        Admin
                      </button>
                    )}
                  </div>
                </div>

                {/* Chat Tab */}
                {activeTab === 'chat' && (
                  <div className="flex-1 flex flex-col">
                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                      {messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p>No messages yet. Start the conversation!</p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.sender_type === 'csm' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs px-4 py-3 rounded-lg ${
                                msg.sender_type === 'csm'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-900 border border-gray-200'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                              <p className={`text-xs mt-1 ${msg.sender_type === 'csm' ? 'text-blue-100' : 'text-gray-500'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Message Input */}
                    <div className="border-t border-gray-200 bg-white p-6">
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyPress={sendMessage}
                          placeholder="Type a message..."
                          className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                        />
                        <button
                          onClick={handleSendButtonClick}
                          disabled={sendingMessage || !messageInput.trim()}
                          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                        >
                          <Send size={16} />
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Admin Tab */}
                {activeTab === 'admin' && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                      <div className="space-y-6">
                        {/* Conversation Stats */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h3 className="font-semibold text-gray-900 mb-4">Conversation Statistics</h3>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4">
                              <p className="text-sm text-gray-600">Total Messages</p>
                              <p className="text-3xl font-bold text-blue-600 mt-2">{messages.length}</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4">
                              <p className="text-sm text-gray-600">Internal Notes</p>
                              <p className="text-3xl font-bold text-green-600 mt-2">{notes.filter(n => n.visibility === 'internal').length}</p>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-4">
                              <p className="text-sm text-gray-600">Shared Notes</p>
                              <p className="text-3xl font-bold text-purple-600 mt-2">{notes.filter(n => n.visibility === 'shared').length}</p>
                            </div>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="bg-white rounded-lg border border-gray-200 p-6">
                          <h3 className="font-semibold text-gray-900 mb-4">Recent Activity</h3>
                          <div className="space-y-3">
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Last message</p>
                                <p className="text-xs text-gray-600">
                                  {messages.length > 0 ? new Date(messages[messages.length - 1].created_at).toLocaleString() : 'No messages'}
                                </p>
                              </div>
                              <span className="text-xs font-medium px-3 py-1 bg-blue-100 text-blue-700 rounded">Chat</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="text-sm font-medium text-gray-900">Last note</p>
                                <p className="text-xs text-gray-600">
                                  {notes.length > 0 ? new Date(notes[0].created_at).toLocaleString() : 'No notes'}
                                </p>
                              </div>
                              <span className="text-xs font-medium px-3 py-1 bg-yellow-100 text-yellow-700 rounded">Note</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="flex-1 flex flex-col">
                    {/* Notes List */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                      {notes.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <p>No notes yet. Add your first note!</p>
                        </div>
                      ) : (
                        notes.map((note) => (
                          <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                  {note.first_name?.[0]}{note.last_name?.[0]}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900 text-sm">{note.first_name} {note.last_name}</p>
                                  <p className="text-xs text-gray-500">
                                    {new Date(note.created_at).toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                note.visibility === 'internal'
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-blue-100 text-blue-700'
                              }`}>
                                {note.visibility === 'internal' ? 'Internal' : 'Shared with customer'}
                              </span>
                            </div>
                            <p className="text-gray-700 text-sm mb-3">{note.content}</p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-xs text-red-600 hover:text-red-700 font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Note Input */}
                    <div className="border-t border-gray-200 bg-white p-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">Add Note</label>
                      <textarea
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Write a note..."
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm mb-3"
                        rows="3"
                      />
                      
                      <div className="flex items-center gap-4 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="visibility"
                            value="internal"
                            checked={noteVisibility === 'internal'}
                            onChange={(e) => setNoteVisibility(e.target.value)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Internal</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="visibility"
                            value="shared"
                            checked={noteVisibility === 'shared'}
                            onChange={(e) => setNoteVisibility(e.target.value)}
                            className="cursor-pointer"
                          />
                          <span className="text-sm text-gray-700">Share with customer</span>
                        </label>
                      </div>

                      <button
                        onClick={handleAddNote}
                        disabled={sendingNote || !noteInput.trim()}
                        className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        Add Note
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p>Select a conversation to start messaging</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
