import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import QRCode from 'react-qr-code';
import { adminApi, projectsApi, postsApi } from '../services/api';
import type { PostComponent } from '../types';
import {
  QrCode, Upload, Plus, Trash2, RefreshCw,
  CheckCircle2, AlertCircle, ChevronDown, Printer,
} from 'lucide-react';

type Tab = 'qr-sheet' | 'manage';

// ── QR Sheet ─────────────────────────────────────────────────────────────────

function QrSheet() {
  const [projectId, setProjectId] = useState('');
  const [lineId, setLineId]       = useState('');
  const [postId, setPostId]       = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const selectedProject  = projects.find((p) => p.id === projectId);
  const lines            = selectedProject?.lines ?? [];
  const selectedLine     = lines.find((l) => l.id === lineId);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', lineId, projectId],
    queryFn:  () => postsApi.list({ lineId: lineId || undefined, projectId: projectId || undefined }),
    enabled:  !!(lineId || projectId),
  });

  const { data: pcs = [], isLoading } = useQuery({
    queryKey: ['admin-pcs-qr', projectId, lineId, postId],
    queryFn:  () => adminApi.listPostComponents({
      postId:    postId    || undefined,
      lineId:    lineId    || undefined,
      projectId: projectId || undefined,
    }),
    enabled: !!(projectId || lineId || postId),
  });

  // Group cards by post for printing
  const grouped = pcs.reduce<Record<string, PostComponent[]>>((acc, pc) => {
    const key = pc.post.id;
    if (!acc[key]) acc[key] = [];
    acc[key].push(pc);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">Select scope to generate</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Project</label>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setLineId(''); setPostId(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Line</label>
            <select value={lineId} onChange={(e) => { setLineId(e.target.value); setPostId(''); }}
              disabled={!projectId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All lines</option>
              {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Post</label>
            <select value={postId} onChange={(e) => setPostId(e.target.value)}
              disabled={!lineId && !projectId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All posts</option>
              {posts.map((p) => <option key={p.id} value={p.id}>Post {p.number}</option>)}
            </select>
          </div>
        </div>
        {pcs.length > 0 && (
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-700 transition"
          >
            <Printer size={15} /> Print QR Sheet ({pcs.length} code{pcs.length > 1 ? 's' : ''})
          </button>
        )}
      </div>

      {!projectId && (
        <div className="text-center py-16 text-gray-400 text-sm">Select a project to preview QR codes</div>
      )}

      {isLoading && projectId && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* QR cards grouped by post — this is also what gets printed */}
      <div id="qr-print-area">
        {Object.entries(grouped).map(([, cards]) => {
          const post = cards[0].post;
          return (
            <div key={post.id} className="mb-8 print:mb-6">
              {/* Post header */}
              <div className="flex items-center gap-3 mb-3 print:mb-2">
                <div className="h-px flex-1 bg-gray-200" />
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest px-2 print:text-gray-700">
                  {post.line.project.name} · {post.line.name} · Post {post.number}
                </span>
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              {/* Cards grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 print:grid-cols-4 print:gap-2">
                {cards.map((pc) => (
                  <div key={pc.id}
                    className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm print:rounded-xl print:p-3 print:shadow-none print:border-gray-300"
                  >
                    {/* QR Code — encodes the scan URL */}
                    <QRCode
                      value={`/scan/${pc.qrCode}`}
                      size={120}
                      style={{ height: 'auto', width: '100%', maxWidth: 120 }}
                      viewBox="0 0 256 256"
                    />
                    <p className="font-mono text-xs font-bold text-gray-900 text-center leading-tight mt-1 break-all">
                      {pc.component.reference}
                    </p>
                    <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full text-center">
                      {pc.component.category}
                    </span>
                    <p className="text-[10px] text-gray-400 text-center leading-tight">
                      {post.line.name} · P{post.number}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <style>{`
        @media print {
          body > * { display: none !important; }
          #qr-print-area { display: block !important; }
          #qr-print-area * { display: revert !important; }
        }
      `}</style>
    </div>
  );
}

// ── Manage components ─────────────────────────────────────────────────────────

function ManageComponents() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [projectId, setProjectId] = useState('');
  const [lineId, setLineId]       = useState('');
  const [postId, setPostId]       = useState('');

  // Add form state
  const [addPostId, setAddPostId]       = useState('');
  const [addReference, setAddReference] = useState('');
  const [addCategory, setAddCategory]   = useState('');
  const [showAdd, setShowAdd]           = useState(false);

  // Import state
  const [importResult, setImportResult] = useState<{ created: number; reactivated: number; skipped: number; errors: string[] } | null>(null);
  const [importError, setImportError]   = useState('');

  const { data: projects = [] } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list() });
  const selectedProject = projects.find((p) => p.id === projectId);
  const lines = selectedProject?.lines ?? [];

  const { data: posts = [] } = useQuery({
    queryKey: ['posts', lineId, projectId],
    queryFn:  () => postsApi.list({ lineId: lineId || undefined, projectId: projectId || undefined }),
    enabled:  !!(lineId || projectId),
  });

  const { data: pcs = [], isLoading } = useQuery({
    queryKey: ['admin-pcs', projectId, lineId, postId],
    queryFn:  () => adminApi.listPostComponents({
      postId: postId || undefined, lineId: lineId || undefined, projectId: projectId || undefined,
    }),
    enabled: !!(projectId || lineId || postId),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-pcs'] });
    void qc.invalidateQueries({ queryKey: ['admin-pcs-qr'] });
    void qc.invalidateQueries({ queryKey: ['projects'] });
    void qc.invalidateQueries({ queryKey: ['posts'] });
  };

  const removeMutation = useMutation({
    mutationFn: (id: string) => adminApi.removeComponent(id),
    onSuccess: invalidate,
  });

  const regenMutation = useMutation({
    mutationFn: (id: string) => adminApi.regenerateQr(id),
    onSuccess: invalidate,
  });

  const addMutation = useMutation({
    mutationFn: () => adminApi.addComponent({ postId: addPostId, reference: addReference.trim(), category: addCategory.trim() }),
    onSuccess: () => {
      setAddReference(''); setAddCategory(''); setShowAdd(false);
      invalidate();
    },
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => adminApi.importExcel(file),
    onSuccess: (result) => { setImportResult(result); invalidate(); },
    onError:   (e: any) => setImportError(e?.response?.data?.message ?? 'Import failed'),
  });

  return (
    <div className="space-y-5">
      {/* Import Excel card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Upload size={15} className="text-blue-500" /> Import from Excel
        </h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Upload a <code>.xlsx</code> file with columns:{' '}
          <strong>Project · Line · Post · Category · Reference</strong> — one row per component at a post.
          Existing entries are skipped; removed ones are re-activated.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) { setImportResult(null); setImportError(''); importMutation.mutate(f); }
            e.target.value = '';
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importMutation.isPending}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition"
        >
          <Upload size={15} />
          {importMutation.isPending ? 'Importing…' : 'Choose Excel file'}
        </button>

        {importResult && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 space-y-1">
            <p className="text-emerald-700 text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 size={14} /> Import complete
            </p>
            <p className="text-emerald-600 text-xs">
              {importResult.created} created · {importResult.reactivated} re-activated · {importResult.skipped} skipped
            </p>
            {importResult.errors.length > 0 && (
              <details className="mt-1">
                <summary className="text-xs text-amber-600 cursor-pointer">{importResult.errors.length} row error(s)</summary>
                <ul className="mt-1 text-xs text-amber-700 space-y-0.5 list-disc list-inside">
                  {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
        {importError && (
          <p className="text-red-600 text-sm flex items-center gap-1"><AlertCircle size={13} /> {importError}</p>
        )}
      </div>

      {/* Filter + list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Components</h2>
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <Plus size={15} /> Add component
            <ChevronDown size={13} className={`transition-transform ${showAdd ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Post *</label>
                <select value={addPostId} onChange={(e) => setAddPostId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select post</option>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>{p.line.name} · Post {p.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Reference *</label>
                <input value={addReference} onChange={(e) => setAddReference(e.target.value)}
                  placeholder="e.g. REF-001"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Category *</label>
                <input value={addCategory} onChange={(e) => setAddCategory(e.target.value)}
                  placeholder="e.g. CRIMPING"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <button
              onClick={() => addMutation.mutate()}
              disabled={!addPostId || !addReference.trim() || !addCategory.trim() || addMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-5 py-2 rounded-xl transition"
            >
              {addMutation.isPending ? 'Adding…' : 'Add'}
            </button>
            {addMutation.isError && (
              <p className="text-red-600 text-xs">{(addMutation.error as any)?.response?.data?.message ?? 'Error'}</p>
            )}
          </div>
        )}

        {/* Scope filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Project</label>
            <select value={projectId} onChange={(e) => { setProjectId(e.target.value); setLineId(''); setPostId(''); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">— Select project —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Line</label>
            <select value={lineId} onChange={(e) => { setLineId(e.target.value); setPostId(''); }}
              disabled={!projectId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All lines</option>
              {lines.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Post</label>
            <select value={postId} onChange={(e) => setPostId(e.target.value)}
              disabled={!lineId && !projectId}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-40">
              <option value="">All posts</option>
              {posts.map((p) => <option key={p.id} value={p.id}>Post {p.number}</option>)}
            </select>
          </div>
        </div>

        {/* Table */}
        {!projectId ? (
          <p className="text-center text-gray-400 text-sm py-8">Select a project to view components</p>
        ) : isLoading ? (
          <div className="flex justify-center py-8">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pcs.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">No components found</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Reference</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Category</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Line</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Post</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">QR Code</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {pcs.map((pc) => (
                  <tr key={pc.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{pc.component.reference}</td>
                    <td className="px-4 py-2.5">
                      <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-0.5 rounded-full">{pc.component.category}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{pc.post.line.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{pc.post.number}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-400 text-xs truncate max-w-[120px]">{pc.qrCode}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          title="Regenerate QR"
                          onClick={() => regenMutation.mutate(pc.id)}
                          disabled={regenMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <RefreshCw size={14} />
                        </button>
                        <button
                          title="Remove from post"
                          onClick={() => removeMutation.mutate(pc.id)}
                          disabled={removeMutation.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page shell ────────────────────────────────────────────────────────────────

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('qr-sheet');

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="bg-white border-b border-gray-100 px-4 lg:px-8 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <QrCode size={20} className="text-blue-600" />
            QR Code Management
          </h1>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setTab('qr-sheet')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'qr-sheet' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              QR Sheet
            </button>
            <button
              onClick={() => setTab('manage')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === 'manage' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
            >
              Manage
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
        {tab === 'qr-sheet' ? <QrSheet /> : <ManageComponents />}
      </div>
    </div>
  );
}
