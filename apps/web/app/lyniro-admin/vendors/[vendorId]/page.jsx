'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function VendorDetailPage() {
  const params = useParams();
  const vendorId = params.vendorId;
  const [vendor, setVendor] = useState(null);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [activityLog, setActivityLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    const fetchVendorDetail = async () => {
      try {
        const response = await fetch(`/api/lyniro-admin/vendors/${vendorId}`);
        const data = await response.json();
        if (data.success) {
          setVendor(data.vendor);
          setUsers(data.users || []);
          setPlans(data.plans || []);
          setActivityLog(data.activityLog || []);
        }
      } catch (error) {
        console.error('Error fetching vendor:', error);
      } finally {
        setLoading(false);
      }
    };

    if (vendorId) fetchVendorDetail();
  }, [vendorId]);

  const handleImpersonate = async (userId) => {
    try {
      const response = await fetch(`/api/lyniro-admin/vendors/${vendorId}/impersonate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: userId })
      });

      if (response.ok) {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Impersonation error:', error);
      alert('Failed to impersonate user');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading vendor details...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="p-8">
        <div className="text-red-600">Vendor not found</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <Link
        href="/lyniro-admin/vendors"
        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back to Vendors</span>
      </Link>

      {/* Vendor Overview Card */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">{vendor.name}</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-600 mb-1">Owner Email</p>
            <p className="font-medium text-slate-900">{vendor.owner_email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Tier</p>
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm font-medium">
              {vendor.tier || 'free'}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Users</p>
            <p className="font-medium text-slate-900">{users.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Total Plans</p>
            <p className="font-medium text-slate-900">{plans.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 mb-6">
        <div className="flex border-b border-gray-200">
          {['users', 'plans', 'activity'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="p-6">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Role</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-3">{user.first_name} {user.last_name}</td>
                    <td className="py-3 text-gray-600">{user.email}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => handleImpersonate(user.id)}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        Login as User
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">No users found</div>
            )}
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="p-6">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Stage</th>
                  <th className="pb-3 font-medium">Completion</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="py-3">{plan.customer_name}</td>
                    <td className="py-3 text-gray-600">{plan.company_name}</td>
                    <td className="py-3">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {plan.stage}
                      </span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${Math.round(plan.completion_percentage || 0)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600">
                          {Math.round(plan.completion_percentage || 0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">
                      {new Date(plan.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {plans.length === 0 && (
              <div className="text-center py-8 text-gray-500">No plans found</div>
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="p-6">
            <table className="w-full">
              <thead className="border-b border-gray-200">
                <tr className="text-left text-sm text-gray-600">
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Plan ID</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activityLog.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 font-medium">{log.action}</td>
                    <td className="py-3 text-gray-600">{log.plan_id || '-'}</td>
                    <td className="py-3 text-gray-600">
                      {new Date(log.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {activityLog.length === 0 && (
              <div className="text-center py-8 text-gray-500">No activity found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
