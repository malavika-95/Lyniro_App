'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await fetch('/api/lyniro-admin/vendors');
        const data = await response.json();
        if (data.success) {
          setVendors(data.vendors || []);
        }
      } catch (error) {
        console.error('Error fetching vendors:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const filtered = useMemo(() => {
    if (!search) return vendors;
    const q = search.toLowerCase();
    return vendors.filter(
      (v) =>
        v.name?.toLowerCase().includes(q) ||
        v.owner_email?.toLowerCase().includes(q)
    );
  }, [vendors, search]);

  const getTierBadgeColor = (tier) => {
    const colors = {
      'free': 'bg-gray-100 text-gray-800',
      'starter': 'bg-blue-100 text-blue-800',
      'growth': 'bg-purple-100 text-purple-800',
      'scale': 'bg-amber-100 text-amber-800'
    };
    return colors[tier] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-gray-600">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Vendors</h1>
      <p className="text-gray-600 mb-6">Manage and view all vendor accounts</p>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by vendor name or owner email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Company</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Owner Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Users</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Plans</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tier</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Activity</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((vendor) => (
              <tr key={vendor.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-slate-900">{vendor.name}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.owner_email || '-'}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.user_count}</td>
                <td className="px-6 py-4 text-gray-600">{vendor.plan_count}</td>
                <td className="px-6 py-4">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getTierBadgeColor(vendor.tier)}`}>
                    {vendor.tier || 'free'}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-600">
                  {vendor.last_activity ? new Date(vendor.last_activity).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <Link
                    href={`/lyniro-admin/vendors/${vendor.id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            {vendors.length === 0 ? 'No vendors found' : 'No vendors match your search'}
          </div>
        )}
      </div>
    </div>
  );
}
