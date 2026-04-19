'use client';

import { useEffect, useState, useMemo } from 'react';
import { format } from 'date-fns';

export default function AuditLogPage() {
  const [auditLog, setAuditLog] = useState([]);
  const [actionFilter, setActionFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        const response = await fetch('/api/lyniro-admin/audit-log');
        const data = await response.json();
        if (data.success) {
          setAuditLog(data.auditLog || []);
        }
      } catch (error) {
        console.error('Error fetching audit log:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLog();
  }, []);

  const actions = useMemo(
    () => [...new Set(auditLog.map((log) => log.action))],
    [auditLog]
  );

  const filtered = useMemo(() => {
    if (!actionFilter) return auditLog;
    return auditLog.filter((log) => log.action === actionFilter);
  }, [auditLog, actionFilter]);

  const formatTime = (date) => {
    const now = new Date();
    const logDate = new Date(date);
    const diffMs = now - logDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return format(logDate, 'MMM d, yyyy');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading audit log...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Audit Log</h1>
      <p className="text-gray-600 mb-6">Admin actions and system events</p>

      {/* Filter */}
      <div className="mb-6">
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">All Actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Admin</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Target</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">IP Address</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium text-slate-900">
                    {log.first_name} {log.last_name}
                  </div>
                  <div className="text-xs text-gray-600">{log.admin_email}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {log.action}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {log.target_type && (
                    <>
                      <div className="text-sm font-medium">{log.target_email || log.target_id || '-'}</div>
                      <div className="text-xs text-gray-500">{log.target_type}</div>
                    </>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-600 text-sm">{log.ip_address || '-'}</td>
                <td className="px-6 py-4 text-gray-600 text-sm">{formatTime(log.created_at)}</td>
                <td className="px-6 py-4">
                  {log.metadata && (
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      {expandedId === log.id ? 'Hide' : 'Show'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {auditLog.length === 0 ? 'No audit logs found' : 'No logs match your filter'}
          </div>
        )}
      </div>

      {/* Expanded Metadata */}
      {expandedId && (
        <div className="mt-4 bg-gray-50 rounded-lg border border-gray-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-2">Metadata</h3>
          <pre className="bg-white p-3 rounded border border-gray-200 text-xs overflow-x-auto">
            {JSON.stringify(
              auditLog.find((log) => log.id === expandedId)?.metadata,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
