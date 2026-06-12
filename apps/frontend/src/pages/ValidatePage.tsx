import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { componentsApi, requestsApi } from '../services/api';
import type { PostComponent } from '../types';
// ComponentRequest app — validate and submit a component request
import { CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';

export function ValidatePage() {
  const { qrCode } = useParams<{ qrCode: string }>();
  const navigate = useNavigate();

  const [notes, setNotes] = useState('');
  const [overrideComponentId, setOverrideComponentId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Resolve QR → PostComponent (has both component + post)
  const { data: scanned, isLoading, error: scanError } = useQuery({
    queryKey: ['scan', qrCode],
    queryFn: () => componentsApi.getByQr(qrCode!),
    enabled: !!qrCode,
    retry: 1,
  });

  // Fetch all components at the same post for the correction dropdown
  const { data: siblingsRaw = [] } = useQuery({
    queryKey: ['post-components', scanned?.postId],
    queryFn: () => componentsApi.getByPost(scanned!.postId),
    enabled: !!scanned,
  });

  const activeComponentId = overrideComponentId ?? scanned?.componentId ?? null;

  const submitMutation = useMutation({
    mutationFn: () => requestsApi.create({
      componentId: activeComponentId!,
      postId: scanned!.postId,
      notes: notes.trim() || undefined,
    }),
    onSuccess: () => setSubmitted(true),
  });

  // ── Success screen ───────────────────────────────────────────────────────────
  if (submitted && scanned) {
    const component = siblingsRaw.find((s) => s.componentId === activeComponentId)?.component
      ?? scanned.component;
    return (
      <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle size={40} className="text-emerald-400" strokeWidth={1.5} />
        </div>
        <div>
          <h2 className="text-white text-xl font-bold mb-2">Request Sent</h2>
          <p className="text-gray-400 text-sm leading-relaxed">
            <span className="text-white font-semibold">{component.reference}</span>
            {' '}·{' '}
            <span className="text-white font-semibold">{scanned.post.line.project.name}</span>
            {' / '}
            <span className="text-white font-semibold">{scanned.post.line.name}</span>
            {' / Post '}
            <span className="text-white font-semibold">{scanned.post.number}</span>
          </p>
        </div>
        <button onClick={() => navigate('/')} className="bg-blue-600 text-white font-bold px-10 py-3 rounded-2xl text-sm">
          Back to Home
        </button>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (scanError || !scanned) {
    return (
      <div className="min-h-dvh bg-gray-950 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-red-900/30 flex items-center justify-center">
          <AlertCircle size={40} className="text-red-400" strokeWidth={1.5} />
        </div>
        <h2 className="text-white text-xl font-bold">QR Code Not Found</h2>
        <p className="text-gray-400 text-sm">This QR code is not registered in the system.</p>
        <button onClick={() => navigate('/')} className="bg-white text-black font-bold px-10 py-3 rounded-2xl text-sm">
          Try Again
        </button>
      </div>
    );
  }

  const post = scanned.post;
  const siblings: PostComponent[] = siblingsRaw.length > 0 ? siblingsRaw : [scanned];

  return (
    <div className="min-h-dvh bg-gray-950 flex flex-col">
      <header className="flex items-center gap-3 px-4 pt-4 pb-3 shrink-0">
        <button onClick={() => navigate('/')} className="text-white text-sm bg-white/10 rounded-full px-4 py-2">
          Back
        </button>
        <h1 className="text-white font-semibold">Confirm Component Request</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 space-y-4">

        {/* Location: project / line / post */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Location</span>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">Project</p>
              <p className="text-white font-semibold text-sm truncate">{post.line.project.name}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">Line</p>
              <p className="text-white font-bold text-lg">{post.line.name}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3">
              <p className="text-gray-500 text-xs mb-1">Post</p>
              <p className="text-white font-bold text-lg">{post.number}</p>
            </div>
          </div>
        </div>

        {/* Component */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2">
          <span className="text-gray-400 text-xs uppercase tracking-wider">Component</span>

          {siblings.length > 1 ? (
            <>
              <div className="relative">
                <select
                  value={activeComponentId ?? ''}
                  onChange={(e) =>
                    setOverrideComponentId(e.target.value === scanned.componentId ? null : e.target.value)
                  }
                  className="w-full bg-white/10 text-white font-mono font-semibold text-base rounded-xl px-3 py-3 pr-8 appearance-none border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {siblings.map((s) => (
                    <option key={s.componentId} value={s.componentId} className="bg-gray-900">
                      {s.component.reference}
                      {s.componentId === scanned.componentId ? ' ✓' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Show category of selected */}
              {(() => {
                const sel = siblings.find((s) => s.componentId === activeComponentId);
                return sel ? (
                  <p className="text-blue-300 text-xs font-medium">{sel.component.category}</p>
                ) : null;
              })()}

              {overrideComponentId && overrideComponentId !== scanned.componentId && (
                <p className="text-amber-400 text-xs">⚠ Changed from scanned reference — please verify.</p>
              )}
            </>
          ) : (
            <div>
              <p className="text-white font-mono font-bold text-2xl">{scanned.component.reference}</p>
              <p className="text-blue-300 text-xs font-medium mt-1">{scanned.component.category}</p>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
          <label className="text-gray-400 text-sm block mb-2">Notes (optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. urgent, broken during shift B..."
            rows={2}
            className="w-full bg-white/10 text-white rounded-xl px-3 py-2.5 text-sm border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-600 resize-none"
          />
        </div>

        {submitMutation.isError && (
          <div className="bg-red-900/30 border border-red-500/30 rounded-2xl px-4 py-3">
            <p className="text-red-300 text-sm">
              {(submitMutation.error as any)?.response?.data?.message ?? 'Failed to submit. Try again.'}
            </p>
          </div>
        )}

        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !activeComponentId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl text-base transition active:scale-[0.98]"
        >
          {submitMutation.isPending ? 'Sending...' : 'Send Request'}
        </button>
      </div>
    </div>
  );
}
