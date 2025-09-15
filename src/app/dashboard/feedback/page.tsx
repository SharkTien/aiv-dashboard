"use client";
import { useEffect, useRef, useState } from "react";

type Feedback = {
  id: number;
  user_id: number;
  title: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
};

type Reply = {
  id: number;
  feedback_id: number;
  author_id: number;
  message: string;
  created_at: string;
};

export default function FeedbackPage() {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [showComposer, setShowComposer] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [replyingId, setReplyingId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const [replies, setReplies] = useState<Record<number, Reply[]>>({});
  const [repliesLoading, setRepliesLoading] = useState<Record<number, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me', { cache: 'no-store' });
        const json = await me.json();
        setIsAdmin(json?.user?.role === 'admin');
      } catch {}
    })();
  }, []);

  async function load() {
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/feedback?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      if ((e as any)?.name !== 'AbortError') {
        console.error('Load feedback error:', e);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function loadRepliesFor(feedbackId: number) {
    setRepliesLoading((s) => ({ ...s, [feedbackId]: true }));
    try {
      const res = await fetch(`/api/feedback/${feedbackId}/replies`, { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && data?.success) {
        setReplies((prev) => ({ ...prev, [feedbackId]: Array.isArray(data.items) ? data.items : [] }));
      }
    } catch (e) {
      // ignore
    } finally {
      setRepliesLoading((s) => ({ ...s, [feedbackId]: false }));
    }
  }

  // Load replies for visible items
  useEffect(() => {
    items.forEach((fb) => {
      if (!replies[fb.id]) {
        loadRepliesFor(fb.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) return;
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), message: message.trim() })
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || 'Failed to submit');
      return;
    }
    setTitle("");
    setMessage("");
    load();
    // refresh notification count if available
    (window as any).refreshNotificationCount?.();
  }

  async function sendReply(id: number) {
    const body: any = { message: replyText };
    if (isAdmin) {
      // admin may toggle status via quick action: keep as open by default
    }
    const res = await fetch(`/api/feedback/${id}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data?.error || 'Failed to reply');
      return;
    }
    setReplyText("");
    setReplyingId(null);
    // Reload thread and list
    loadRepliesFor(id);
    load();
    (window as any).refreshNotificationCount?.();
  }

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Feedback</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">Send feedback to admins. Admins can reply back.</p>
        <div className="mt-3">
          <button
            onClick={() => setShowComposer(true)}
            className="h-9 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
          >
            Compose Feedback
          </button>
        </div>
      </header>

      {/* Floating Composer like Gmail */}
      {showComposer && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] max-w-md shadow-2xl">
          <div className="rounded-t-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100">New Feedback</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowComposer(false)}
                className="h-7 px-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 text-xs text-gray-800 dark:text-gray-100"
                aria-label="Close"
                title="Close"
              >
                Close
              </button>
            </div>
          </div>
          <form onSubmit={submitFeedback} className="rounded-b-lg bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-600 p-3 space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Brief title"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full min-h-28 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Describe your feedback..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setTitle(""); setMessage(""); setShowComposer(false); }}
                className="h-9 px-3 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-sm"
              >
                Discard
              </button>
              <button
                type="submit"
                className="h-9 px-4 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-end gap-3">
        <div>
          <label className="block text-xs text-gray-600 dark:text-gray-300 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <button onClick={load} className="h-10 px-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white">Refresh</button>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-sm font-medium text-gray-900 dark:text-white">Feedback Items</h2>
          {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {items.map((fb) => (
            <div key={fb.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{fb.title}</h3>
                  <p className="text-xs text-gray-500">#{fb.id} • {new Date(fb.created_at).toLocaleString()} • {fb.status.toUpperCase()}</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2">
                    <button onClick={async () => { await fetch(`/api/feedback/${fb.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '[Status changed to OPEN]', status: 'open' }) }); load(); }} className="h-8 px-3 rounded-md bg-gray-100 dark:bg-gray-700 text-xs">Mark Open</button>
                    <button onClick={async () => { await fetch(`/api/feedback/${fb.id}/reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '[Status changed to CLOSED]', status: 'closed' }) }); load(); }} className="h-8 px-3 rounded-md bg-gray-100 dark:bg-gray-700 text-xs">Mark Closed</button>
                    <button onClick={async () => {
                      if (!confirm('Delete this feedback?')) return;
                      const res = await fetch(`/api/feedback/${fb.id}`, { method: 'DELETE' });
                      const data = await res.json();
                      if (!res.ok) { alert(data?.error || 'Delete failed'); return; }
                      load();
                    }} className="h-8 px-3 rounded-md bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs">Delete</button>
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{fb.message}</p>

              {/* Replies */}
              <div className="mt-3 space-y-2">
                {repliesLoading[fb.id] && (
                  <div className="text-xs text-gray-500">Loading replies...</div>
                )}
                {(replies[fb.id] || []).map((r) => (
                  <div key={r.id} className="rounded-md bg-gray-50 dark:bg-gray-700/50 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Reply #{r.id}</span>
                      <span className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleString()}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{r.message}</div>
                  </div>
                ))}
                {replies[fb.id] && replies[fb.id].length === 0 && !repliesLoading[fb.id] && (
                  <div className="text-xs text-gray-400">No replies yet.</div>
                )}
              </div>

              {/* Reply box */}
              <div className="mt-3">
                {replyingId === fb.id ? (
                  <div className="flex items-start gap-2">
                    <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} className="flex-1 min-h-16 rounded-md ring-1 ring-black/10 dark:ring-white/10 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white" placeholder="Write a reply..." />
                    <div className="flex flex-col gap-2">
                      <button onClick={() => sendReply(fb.id)} className="h-9 px-3 rounded-md bg-sky-600 hover:bg-sky-700 text-white text-sm">Send</button>
                      <button onClick={() => { setReplyingId(null); setReplyText(""); }} className="h-9 px-3 rounded-md bg-gray-100 dark:bg-gray-700 text-sm">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setReplyingId(fb.id)} className="h-8 px-3 mt-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-xs">Reply</button>
                )}
              </div>
            </div>
          ))}
          {items.length === 0 && !loading && (
            <div className="p-6 text-center text-sm text-gray-500">No feedback yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}


