'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/header';
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle, BarChart2, Clock, ShieldAlert, Minus, Users } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [csmData, setCsmData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [csmFilter, setCsmFilter] = useState('all');
  const [teamList, setTeamList] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [teamPerformance, setTeamPerformance] = useState([]);
  const [churnRisk, setChurnRisk] = useState({ highRisk: [], mediumRisk: [], recentlyCompleted: [] });
  const [activityTrend, setActivityTrend] = useState([]);

  useEffect(() => {
    const loadSession = async () => {
      try {
        const res = await fetch('/api/auth/csm-session');
        const result = await res.json();
        const data = result.data || result;
        if (!res.ok || !data.userId) { router.push('/'); return; }
        setCsmData(data);
      } catch { router.push('/'); }
    };
    loadSession();
  }, [router]);

  // Load team list once for the CSM filter dropdown
  useEffect(() => {
    if (!csmData) return;
    const loadTeam = async () => {
      try {
        const res = await fetch('/api/analytics/team-performance?dateRange=30');
        if (res.ok) {
          const d = await res.json();
          if (Array.isArray(d)) setTeamList(d);
        }
      } catch (e) { console.error(e); }
    };
    loadTeam();
  }, [csmData]);

  // Load all analytics data when filters change
  useEffect(() => {
    if (!csmData) return;
    const load = async () => {
      setLoading(true);
      try {
        const params = `?dateRange=${dateRange}&csmId=${csmFilter}`;
        const [sumRes, pipeRes, teamRes, churnRes, trendRes] = await Promise.all([
          fetch(`/api/analytics/summary${params}`),
          fetch(`/api/analytics/pipeline${params}`),
          fetch(`/api/analytics/team-performance${params}`),
          fetch(`/api/analytics/churn-risk${params}`),
          fetch(`/api/analytics/activity-trend${params}`)
        ]);
        if (sumRes.ok) setSummary(await sumRes.json());
        if (pipeRes.ok) setPipeline(await pipeRes.json());
        if (teamRes.ok) { const d = await teamRes.json(); setTeamPerformance(Array.isArray(d) ? d : []); }
        if (churnRes.ok) { const d = await churnRes.json(); setChurnRisk({ highRisk: d.highRisk || [], mediumRisk: d.mediumRisk || [], recentlyCompleted: d.recentlyCompleted || [] }); }
        if (trendRes.ok) { const d = await trendRes.json(); setActivityTrend(Array.isArray(d) ? d : []); }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [csmData, dateRange, csmFilter]);

  if (!csmData) return null;

  const showTeamFilter = csmData.role === 'owner' || csmData.role === 'manager';
  const allRiskPlans = [...(churnRisk.highRisk || []), ...(churnRisk.mediumRisk || [])];
  const maxTrend = Math.max(...activityTrend.map(p => (p.customer_tasks || 0) + (p.vendor_tasks || 0) + (p.messages || 0)), 1);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header currentPage="analytics" profile={csmData} unreadMessageCount={0} notifications={[]} />

      {/* Sticky Filter Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            {[{ label: '7 days', value: '7' }, { label: '30 days', value: '30' }, { label: '90 days', value: '90' }, { label: 'All time', value: '36500' }].map(btn => (
              <button key={btn.value} onClick={() => setDateRange(btn.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${dateRange === btn.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}>
                {btn.label}
              </button>
            ))}
          </div>
          {showTeamFilter && teamList.length > 0 && (
            <select value={csmFilter} onChange={e => setCsmFilter(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All CSMs</option>
              {teamList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading analytics...</div>
      ) : (
        <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-10">

          {/* SECTION 1: Overview KPI Cards */}
          {summary && (
            <section>
              <h2 className="text-base font-bold text-gray-900 mb-4 uppercase tracking-wide text-xs text-gray-500">Overview</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Active Plans" value={summary.activePlans?.current ?? '—'} icon={<BarChart2 size={18} />} color="blue" trend={summary.activePlans?.trend} />
                <KpiCard label="Completed This Period" value={summary.completedThisPeriod?.current ?? '—'} icon={<CheckCircle size={18} />} color="green" trend={summary.completedThisPeriod?.trend} />
                <KpiCard label="Avg Time to Complete" value={summary.avgDuration?.current ? `${summary.avgDuration.current}d` : '—'} icon={<Clock size={18} />} color="purple" sub="days from start to 100%" />
                <KpiCard label="At-Risk Plans" value={summary.atRiskPlans?.current ?? '—'} icon={<ShieldAlert size={18} />} color={(summary.atRiskPlans?.current || 0) > 0 ? 'amber' : 'green'} />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <KpiCard label="On-Time Rate" value={summary.onTimeRate?.current != null ? `${summary.onTimeRate.current}%` : '—'} icon={<TrendingUp size={18} />} color={summary.onTimeRate?.status === 'good' ? 'green' : summary.onTimeRate?.status === 'warning' ? 'amber' : 'red'} sub="plans completed by go-live date" />
                <KpiCard label="Blocked Tasks" value={summary.blockedTasks?.current ?? '—'} icon={<AlertTriangle size={18} />} color={(summary.blockedTasks?.current || 0) > 0 ? 'amber' : 'green'} sub="across all active plans" />
                <KpiCard label="Customer Engagement" value={summary.customerEngagement?.current != null ? `${summary.customerEngagement.current}%` : '—'} icon={<Users size={18} />} color="blue" sub="customer tasks completed" />
                <KpiCard label="Customer Response Rate" value={summary.customerResponseRate?.current != null ? `${summary.customerResponseRate.current}%` : '—'} icon={<CheckCircle size={18} />} color="purple" sub="plans with ≥1 customer action" />
              </div>
            </section>
          )}

          {/* SECTION 2: Pipeline by Stage + Most Blocked Tasks */}
          {pipeline && (pipeline.plansByStage?.length > 0 || pipeline.mostBlocked?.length > 0) && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Pipeline</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {pipeline.plansByStage?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">Plans by Stage</p>
                      <p className="text-xs text-gray-500 mt-0.5">Where your active plans are right now</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pipeline.plansByStage.map((row, i) => {
                        const days = pipeline.avgDaysPerStage?.find(d => d.stage === row.stage)?.avg_days;
                        const maxCount = Math.max(...pipeline.plansByStage.map(r => Number(r.count)), 1);
                        const pct = Math.round((Number(row.count) / maxCount) * 100);
                        return (
                          <div key={i} className="px-5 py-3">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-sm font-medium text-gray-900">{row.stage}</span>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                {days != null && <span className="text-xs text-gray-400">{Math.round(days)}d avg</span>}
                                <span className="font-semibold text-gray-900">{row.count}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pipeline.mostBlocked?.length > 0 && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm">Top Blocked Tasks</p>
                      <p className="text-xs text-gray-500 mt-0.5">Tasks causing the most friction</p>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {pipeline.mostBlocked.map((row, i) => (
                        <div key={i} className="px-5 py-3 flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{row.task_name}</p>
                            <p className="text-xs text-gray-500">{row.stage_name}</p>
                          </div>
                          <span className="bg-red-100 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">{row.block_count}×</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* SECTION 3: At-Risk Plans */}
          {allRiskPlans.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Risk Signals</h2>
              <div className="space-y-3">
                {churnRisk.highRisk.map((plan, i) => <RiskRow key={`h-${i}`} plan={plan} level="high" />)}
                {churnRisk.mediumRisk.map((plan, i) => <RiskRow key={`m-${i}`} plan={plan} level="medium" />)}
              </div>
            </section>
          )}

          {/* SECTION 4: Weekly Activity (stacked bar chart) */}
          {activityTrend.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Engagement Activity</h2>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex gap-5 mb-5 text-xs text-gray-600">
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Customer Tasks</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-500 inline-block" />Vendor Tasks</span>
                  <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-purple-400 inline-block" />Messages</span>
                </div>
                <div className="flex items-end gap-1 h-40">
                  {activityTrend.map((point, i) => {
                    const ct = point.customer_tasks || 0;
                    const vt = point.vendor_tasks || 0;
                    const msg = point.messages || 0;
                    const total = ct + vt + msg;
                    const heightPct = Math.round((total / maxTrend) * 100);
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center group relative">
                        <span className="opacity-0 group-hover:opacity-100 absolute -top-9 text-xs bg-gray-900 text-white px-2 py-1 rounded whitespace-nowrap z-10">
                          {ct} customer · {vt} vendor · {msg} msg
                        </span>
                        <div className="w-full flex flex-col rounded-t overflow-hidden cursor-pointer hover:opacity-80 transition"
                          style={{ height: `${heightPct}%`, minHeight: total > 0 ? '4px' : '0' }}>
                          <div style={{ flex: ct, background: '#3b82f6' }} />
                          <div style={{ flex: vt, background: '#22c55e' }} />
                          <div style={{ flex: msg, background: '#a78bfa' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-3 border-t border-gray-100 pt-3">
                  <span>{activityTrend[0]?.week_start || ''}</span>
                  <span>{activityTrend[activityTrend.length - 1]?.week_start || ''}</span>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 5: Team Performance */}
          {teamPerformance.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Team Performance</h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">CSM</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Active Plans</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Avg Completion</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Avg Duration</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">On-Time %</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Blocked</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Overdue</th>
                      <th className="text-left py-3 px-5 font-semibold text-gray-700">Health</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPerformance.map((member, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-5 font-medium text-gray-900">{member.name}</td>
                        <td className="py-3 px-5 text-gray-700">{member.activePlans ?? '—'}</td>
                        <td className="py-3 px-5 text-gray-700">{member.avgCompletion != null ? `${member.avgCompletion}%` : '—'}</td>
                        <td className="py-3 px-5 text-gray-700">{member.avgDuration != null ? `${member.avgDuration}d` : '—'}</td>
                        <td className="py-3 px-5 text-gray-700">{member.onTimeRate != null ? `${member.onTimeRate}%` : '—'}</td>
                        <td className="py-3 px-5 text-gray-700">{member.blockedTasks ?? '—'}</td>
                        <td className="py-3 px-5 text-gray-700">{member.overduePlans ?? '—'}</td>
                        <td className="py-3 px-5">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            member.status === 'red' ? 'bg-red-100 text-red-700' :
                            member.status === 'amber' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {member.status === 'red' ? 'At Risk' : member.status === 'amber' ? 'Watch' : 'Good'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Recently Completed */}
          {churnRisk.recentlyCompleted?.length > 0 && (
            <section>
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Recently Completed</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {churnRisk.recentlyCompleted.map((plan, i) => (
                  <div key={i} className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
                    <p className="font-medium text-gray-900">{plan.customer_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{plan.company_name}{plan.csm_name ? ` · ${plan.csm_name}` : ''}</p>
                    <p className="text-xs text-green-600 mt-2 font-semibold">✓ Completed{plan.days_since_activity != null ? ` ${Math.round(plan.days_since_activity)}d ago` : ''}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Empty State */}
          {!summary && !pipeline && teamPerformance.length === 0 && allRiskPlans.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-16 text-center">
              <BarChart2 size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">No data available for the selected period.</p>
              <p className="text-gray-400 text-sm mt-1">Try selecting a wider date range.</p>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, icon, color, trend, sub }) {
  const colors = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-600',   icon: 'text-blue-400' },
    green:  { bg: 'bg-green-50',  text: 'text-green-600',  icon: 'text-green-400' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', icon: 'text-purple-400' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-600',  icon: 'text-amber-400' },
    red:    { bg: 'bg-red-50',    text: 'text-red-600',    icon: 'text-red-400' },
  };
  const c = colors[color] || colors.blue;
  return (
    <div className={`${c.bg} rounded-xl border border-gray-200 p-5 flex flex-col`}>
      <div className={`${c.icon} mb-3`}>{icon}</div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${c.text} mb-1`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {trend && trend !== 'stable' && trend !== 'neutral' && (
        <p className={`text-xs mt-2 flex items-center gap-1 ${trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
          {trend === 'up' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {trend === 'up' ? 'Up vs prev period' : 'Down vs prev period'}
        </p>
      )}
    </div>
  );
}

function RiskRow({ plan, level }) {
  const isHigh = level === 'high';
  const reasons = plan.risk_reasons
    ? (Array.isArray(plan.risk_reasons) ? plan.risk_reasons.map(r => r.label || r).join(', ') : String(plan.risk_reasons))
    : null;
  return (
    <div className={`flex items-center justify-between px-5 py-4 rounded-xl border ${isHigh ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{plan.customer_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{plan.company_name}{plan.csm_name ? ` · ${plan.csm_name}` : ''}</p>
        {reasons && <p className={`text-xs mt-1 ${isHigh ? 'text-red-600' : 'text-amber-600'}`}>{reasons}</p>}
        <p className="text-xs text-gray-400 mt-0.5">
          {plan.completion_pct != null ? `${plan.completion_pct}% complete` : ''}
          {plan.days_since_activity != null ? ` · ${Math.round(plan.days_since_activity)}d since last activity` : ''}
        </p>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full flex-shrink-0 ml-4 ${isHigh ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
        {isHigh ? 'High Risk' : 'Medium Risk'}
      </span>
    </div>
  );
}
