import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QRScanner } from '../components/QRScanner';
import { componentsApi, postsApi, projectsApi } from '../services/api';
import { Keyboard, ChevronDown } from 'lucide-react';
import type { PostComponent } from '../types';

function extractQrCode(raw: string): string {
  const match = raw.match(/\/scan\/([0-9a-f-]{36})/i);
  return match ? match[1] : raw.trim();
}

// ── Manual entry form ─────────────────────────────────────────────────────────

function ManualEntry({ onSubmit }: { onSubmit: (qrCode: string) => void }) {
  const [projectId, setProjectId] = useState('');
  const [lineId,    setLineId]    = useState('');
  const [postId,    setPostId]    = useState('');
  const [refInput,  setRefInput]  = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn:  () => projectsApi.list(),
  });

  const selectedProject = projects.find((p) => p.id === projectId);
  const lines = selectedProject?.lines ?? [];
  const selectedLine = lines.find((l) => l.id === lineId);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts-manual', lineId],
    queryFn:  () => postsApi.list({ lineId }),
    enabled:  !!lineId,
  });

  const { data: postComponents = [] } = useQuery({
    queryKey: ['pcs-manual', postId],
    queryFn:  () => componentsApi.getByPost(postId),
    enabled:  !!postId,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ref = refInput.trim().toUpperCase();
    const pc: PostComponent | undefined =
      postComponents.find((c) => c.component.reference.toUpperCase() === ref) ??
      (postComponents.length === 1 ? postComponents[0] : undefined);
    if (pc) onSubmit(pc.qrCode);
  }

  const canSubmit =
    !!postId &&
    !!refInput.trim() &&
    postComponents.some(
      (c) => c.component.reference.toUpperCase() === refInput.trim().toUpperCase(),
    );

  const selectClass =
    'w-full bg-white/10 text-white border border-white/10 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30 appearance-none';

  return (
    <form onSubmit={handleSubmit} className="space-y-3 w-full">
      {/* Project */}
      <div className="relative">
        <select
          value={projectId}
          onChange={(e) => { setProjectId(e.target.value); setLineId(''); setPostId(''); setRefInput(''); }}
          className={selectClass}
        >
          <option value="" className="bg-gray-900">— Select project —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id} className="bg-gray-900">{p.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Line */}
      <div className="relative">
        <select
          value={lineId}
          onChange={(e) => { setLineId(e.target.value); setPostId(''); setRefInput(''); }}
          disabled={!projectId}
          className={selectClass}
        >
          <option value="" className="bg-gray-900">— Select line —</option>
          {lines.map((l) => (
            <option key={l.id} value={l.id} className="bg-gray-900">{l.name}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Post */}
      <div className="relative">
        <select
          value={postId}
          onChange={(e) => { setPostId(e.target.value); setRefInput(''); }}
          disabled={!lineId}
          className={selectClass}
        >
          <option value="" className="bg-gray-900">— Select post —</option>
          {posts.map((p) => (
            <option key={p.id} value={p.id} className="bg-gray-900">Post {p.number}</option>
          ))}
        </select>
        <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      </div>

      {/* Component — type or pick from list */}
      {postId && (
        <div>
          <input
            list="component-refs"
            value={refInput}
            onChange={(e) => setRefInput(e.target.value)}
            placeholder={
              postComponents.length === 0
                ? 'No components at this post'
                : 'Type or select a reference…'
            }
            disabled={postComponents.length === 0}
            autoComplete="off"
            className="w-full bg-white/10 text-white placeholder:text-gray-600 border border-white/10 rounded-xl px-3 py-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-30"
          />
          <datalist id="component-refs">
            {postComponents.map((pc) => (
              <option key={pc.id} value={pc.component.reference} />
            ))}
          </datalist>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full bg-blue-600 disabled:opacity-40 text-white font-bold py-3 rounded-xl text-sm transition active:scale-[0.98]"
      >
        Confirm
      </button>
    </form>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function ScanPage() {
  const navigate = useNavigate();
  const [scanning,   setScanning]   = useState(false);
  const [showManual, setShowManual] = useState(false);

  function handleDetected(raw: string) {
    navigate(`/validate/${extractQrCode(raw)}`);
  }

  if (scanning) {
    return (
      <div className="h-dvh bg-black flex flex-col">
        <QRScanner onDetected={handleDetected} onCancel={() => setScanning(false)} />
        <div className="px-4 pb-8 pt-4 shrink-0 flex justify-center">
          <button onClick={() => setScanning(false)} className="text-white text-sm bg-white/10 rounded-full px-8 py-3">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-8 px-6 pb-10">
      {/* Logo + title */}
      <div className="text-center">
        <div className="w-24 h-24 rounded-full bg-blue-600/20 flex items-center justify-center mx-auto mb-6">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            <line x1="14" y1="14" x2="14" y2="14"/><line x1="17" y1="14" x2="17" y2="14"/><line x1="20" y1="14" x2="20" y2="14"/>
            <line x1="14" y1="17" x2="14" y2="17"/><line x1="17" y1="17" x2="17" y2="17"/><line x1="20" y1="17" x2="20" y2="17"/>
            <line x1="14" y1="20" x2="14" y2="20"/><line x1="17" y1="20" x2="17" y2="20"/><line x1="20" y1="20" x2="20" y2="20"/>
          </svg>
        </div>
        <h1 className="text-white text-2xl font-bold mb-2">Component Request</h1>
        <p className="text-gray-400 text-sm leading-relaxed">
          Scan the QR code on your workstation post to request a component.
        </p>
      </div>

      <div className="w-full max-w-xs flex flex-col gap-3">
        {/* Scan button */}
        {!showManual && (
          <button
            onClick={() => setScanning(true)}
            className="bg-blue-600 text-white font-bold px-12 py-4 rounded-2xl text-lg shadow-lg active:scale-95 transition-transform w-full"
          >
            Scan QR Code
          </button>
        )}

        {/* Toggle manual */}
        <button
          onClick={() => setShowManual((v) => !v)}
          className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-300 text-sm transition-colors py-1"
        >
          <Keyboard size={15} />
          {showManual ? 'Cancel' : 'Enter manually'}
        </button>

        {/* Manual form */}
        {showManual && <ManualEntry onSubmit={(qrCode) => navigate(`/validate/${qrCode}`)} />}
      </div>
    </div>
  );
}
