import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { requestsApi, projectsApi, postsApi } from '../services/api';
import type { ComponentRequest, RequestStatus } from '../types';
import { connectSocket, joinManagement, onRequestNew, onRequestUpdated } from '../services/socket';
import { formatDistanceToNow, parseISO, startOfMonth, format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ClipboardList, CheckCircle2, XCircle, BarChart2, Clock, Layers, Hash } from 'lucide-react';

type Tab = 'requests' | 'dashboard';

const STATUS_META: Record<RequestStatus, { label: string; color: string; bg: string; dot: string }> = {
  PENDING:   { label: 'Pending',   color: 'text-amber-700',   bg: 'bg-amber-50   border-amber-200',   dot: 'bg-amber-400'   },
  ISSUED:    { label: 'Issued',    color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  CANCELLED: { label: 'Cancelled', color: 'text-gray-500',    bg: 'bg-gray-50    border-gray-200',    dot: 'bg-gray-400'    },
};

function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, color, bg, dot } = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${color} ${bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function RequestCard({ req, onAction }: { req: ComponentRequest; onAction: (id: string, status: RequestStatus) => void }) {
  const post = req.post;
  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${req.status === 'PENDING' ? 'border-amber-200' : 'border-gray-100'}`}>
      <div className={`px-4 py-2 flex items-center justify-between ${req.status === 'PENDING' ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <StatusBadge status={req.status} />
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={11} />
          {formatDistanceToNow(parseISO(req.requestedAt), { addSuffix: true })}
        </span>
      </div>

      <div className="p-4 space-y-2">
        {/* Reference + category */}
        <div>
          <p className="font-mono text-base font-bold text-gray-900">{req.component.reference}</p>
          <p className="text-xs text-blue-600 font-medium mt-0.5">{req.component.category}</p>
        </div>

        {/* Location breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Layers size={11} />{post.line.project.name}</span>
          <span className="text-gray-300">›</span>
          <span>{post.line.name}</span>
          <span className="text-gray-300">›</span>
          <span className="flex items-center gap-1"><Hash size={11} />Post {post.number}</span>
        </div>

        {req.notes && (
          <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2 italic">{req.notes}</p>
        )}

        {req.status === 'PENDING' && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onAction(req.id, 'ISSUED')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <CheckCircle2 size={15} /> Issue
            </button>
            <button
              onClick={() => onAction(req.id, 'CANCELLED')}
              className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold px-4 py-2.5 rounded-xl transition"
            >
              <XCircle size={15} /> Cancel
            </button>
          </div>
        )}

        {req.status === 'ISSUED' && req.issuedAt && (
          <p className="text-xs text-emerald-600">
            Issued {formatDistanceToNow(parseISO(req.issuedAt), { addSuffix: true })}
            {req.issuedBy ? ` by ${req.issuedBy}` : ''}
          </p>
        )}
      </div>
    </div>
  );
}

function DashboardView() {
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [projectId, setProjectId] = useState('');
  const [lineId, setLineId] = useState('');
  const [postId, setPostId] = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const selectedProject = projects.find((p) => p.id === projectId);
  const lines = selectedProject?.lines ?? [];
  const selectedLine = lines.find((l) => l.id === lineId);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', lineId, projectId],
    queryFn: () => postsApi.list({ lineId: lineId || undefined, projectId: projectId || undefined }),
    enabled: !!(lineId || projectId),
  });
  const filteredPosts = lineId ? posts.filter((p) => p.lineId === lineId) : posts;

  const { data: consumption = [], isLoading } = useQuery({
    queryKey: ['consumption', from, to, projectId, lineId, postId],
    queryFn: () => requestsApi.consumption({
      from: new Date(from).toISOString(),
      to: new Date(to + 'T23:59:59').toISOString(),
      projectId: projectId || undefined,
      lineId: lineId || undefined,
      postId: postId || undefined,
    }),
  });

  const chartData = Object.values(
    consumption.reduce<Record<string, { reference: string; count: number }>>((acc, r) => {
      const key = r.component.reference;
      if (!acc[key]) acc[key] = { reference: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.count - a.count).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Filters</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Project</label>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setLineId(''); setPostId(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Line</label>
            <select value={lineId} onChange={(e) => { setLineId(e.target.value); setPostId(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All lines</option>
              {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Post</label>
            <select value={postId} onChange={(e) => setPostId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All posts</option>
              {filteredPosts.map((p) => <option key={p.id} value={p.id}>Post {p.number} — {p.line.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{consumption.length}</p>
          <p className="text-xs text-gray-500 mt-1">Requests Issued</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{chartData.length}</p>
          <p className="text-xs text-gray-500 mt-1">Unique References</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <BarChart2 size={16} className="text-blue-500" />
          Component Requests by Reference (top 20)
        </h2>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">No issued requests in selected period</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="reference" angle={-45} textAnchor="end" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip
                formatter={(val: number) => [val, 'Requests']}
                contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb', fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Requests" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Detail table */}
      {consumption.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Reference</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Project</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Line</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Post</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Issued</th>
              </tr>
            </thead>
            <tbody>
              {consumption.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-2.5 font-mono font-semibold text-gray-800">{r.component.reference}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.post.line.project.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.post.line.name}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.post.number}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{r.issuedAt ? format(parseISO(r.issuedAt), 'dd/MM/yy HH:mm') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ManagementPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('requests');
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('PENDING');

  useEffect(() => {
    connectSocket();
    joinManagement();
    const off1 = onRequestNew(() => void qc.invalidateQueries({ queryKey: ['requests'] }));
    const off2 = onRequestUpdated(() => void qc.invalidateQueries({ queryKey: ['requests'] }));
    return () => { off1(); off2(); };
  }, [qc]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests', statusFilter],
    queryFn: () => requestsApi.list(statusFilter === 'ALL' ? {} : { status: statusFilter }),
    staleTime: 0,
    refetchInterval: statusFilter === 'PENDING' ? 15_000 : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RequestStatus }) =>
      requestsApi.updateStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['requests'] }),
  });

  const pendingCount = statusFilter === 'PENDING' ? requests.length : 0;

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList size={20} className="text-blue-600" />
              Component Request Management
            </h1>
            {pendingCount > 0 && (
              <p className="text-xs text-amber-600 font-medium mt-0.5">{pendingCount} pending</p>
            )}
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'requests' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Requests
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'dashboard' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
        {activeTab === 'requests' ? (
          <>
            <div className="flex gap-2 mb-5 overflow-x-auto">
              {(['PENDING', 'ISSUED', 'CANCELLED', 'ALL'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition ${
                    statusFilter === s
                      ? s === 'PENDING'   ? 'bg-amber-100 text-amber-700'
                        : s === 'ISSUED'  ? 'bg-emerald-100 text-emerald-700'
                        : s === 'CANCELLED' ? 'bg-gray-200 text-gray-600'
                        : 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {s === 'ALL' ? 'All' : STATUS_META[s].label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : requests.length === 0 ? (
              <div className="text-center py-24">
                <ClipboardList size={48} className="mx-auto mb-4 text-gray-200" strokeWidth={1.5} />
                <p className="text-gray-400 font-medium">No requests</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {requests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    onAction={(id, status) => updateMutation.mutate({ id, status })}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <DashboardView />
        )}
      </div>
    </div>
  );
}
