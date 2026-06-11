import { useEffect, useState, useCallback } from 'react';
import { api, del } from '../lib/api';

const STATUS_OPTIONS = [
  { key: '',          label: 'All' },
  { key: 'new',       label: 'New' },
  { key: 'read',      label: 'Read' },
  { key: 'responded', label: 'Responded' },
  { key: 'archived',  label: 'Archived' },
];

const STATUS_STYLE = {
  new:       'bg-red-100 text-red-700',
  read:      'bg-amber-100 text-amber-700',
  responded: 'bg-green-100 text-green-700',
  archived:  'bg-ink-100 text-ink-700',
};

export default function EnquiriesPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, last_page: 1, counts: { total: 0, new: 0, read: 0, responded: 0, archived: 0 } });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(async (page = 1) => {
    setBusy(true); setErr('');
    try {
      const r = await api.get('/admin/enquiries', { params: { page, limit: 20, status: status || undefined, q: q || undefined } });
      setRows(r.payload || []);
      setMeta(r.meta || meta);
    } catch (e) {
      setErr(e.message || 'Failed to load enquiries');
    } finally {
      setBusy(false);
    }
  }, [status, q]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(1); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  async function openOne(id) {
    try {
      const r = await api.get(`/admin/enquiries/${id}`);
      setSelected(r.payload);
      // Refresh the list silently so the row's status flips from "new" → "read"
      load(meta.page);
    } catch (e) { alert(e.message); }
  }

  async function patchSelected(patch) {
    if (!selected) return;
    try {
      const r = await api.patch(`/admin/enquiries/${selected.id}`, patch);
      setSelected(r.payload);
      load(meta.page);
    } catch (e) { alert(e.message); }
  }

  async function remove(id) {
    if (!window.confirm('Delete this enquiry permanently?')) return;
    try {
      await del(`/admin/enquiries/${id}`);
      if (selected?.id === id) setSelected(null);
      load(meta.page);
    } catch (e) { alert(e.message); }
  }

  const c = meta.counts || { total: 0, new: 0, read: 0, responded: 0, archived: 0 };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Enquiries</h1>
        <form onSubmit={(e) => { e.preventDefault(); load(1); }} className="flex gap-2">
          <input className="input w-64" placeholder="Search name / email / message" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-ghost">Search</button>
        </form>
      </div>
      <p className="text-sm text-ink-500 mt-1">Messages submitted from the storefront contact form.</p>

      {/* Status tabs with counters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((opt) => {
          const count = opt.key ? c[opt.key] ?? 0 : c.total ?? 0;
          const active = status === opt.key;
          return (
            <button key={opt.key || 'all'} onClick={() => setStatus(opt.key)}
              className={`px-3 py-1.5 rounded-full text-sm border transition ${active ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-300 hover:border-brand-500'}`}>
              {opt.label} <span className={`ml-1 text-xs ${active ? 'text-white/80' : 'text-ink-500'}`}>({count})</span>
            </button>
          );
        })}
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* List */}
        <div className="lg:col-span-2 card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>When</th><th>From</th><th>Subject</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {busy && <tr><td colSpan={5} className="text-center text-ink-500 py-6">Loading…</td></tr>}
              {!busy && rows.length === 0 && <tr><td colSpan={5} className="text-center text-ink-500 py-6">No enquiries match this filter.</td></tr>}
              {rows.map((e) => (
                <tr key={e.id} className={selected?.id === e.id ? 'bg-brand-50/60' : ''}>
                  <td className="text-xs text-ink-500 whitespace-nowrap">{(e.created_at || '').replace('T', ' ').slice(0, 16)}</td>
                  <td>
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-ink-500">{e.email}</div>
                  </td>
                  <td className="text-sm">
                    {e.subject && <span className="badge bg-brand-50 text-brand-700 mr-1">{e.subject}</span>}
                    <div className="line-clamp-2 text-ink-700">{e.message}</div>
                  </td>
                  <td><span className={`badge ${STATUS_STYLE[e.status] || ''}`}>{e.status}</span></td>
                  <td className="text-right whitespace-nowrap">
                    <button onClick={() => openOne(e.id)} className="text-brand-600 hover:underline text-sm mr-3">Open</button>
                    <button onClick={() => remove(e.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {meta.last_page > 1 && (
            <div className="px-3 py-3 flex items-center gap-2 justify-end text-sm border-t border-ink-100">
              <button className="btn-ghost" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>← Prev</button>
              <span className="text-ink-500">Page {meta.page} of {meta.last_page}</span>
              <button className="btn-ghost" disabled={meta.page >= meta.last_page} onClick={() => load(meta.page + 1)}>Next →</button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="card p-5">
          {!selected ? (
            <div className="text-sm text-ink-500">Select an enquiry on the left to read it.</div>
          ) : (
            <EnquiryDetail enquiry={selected} onPatch={patchSelected} onClose={() => setSelected(null)} onDelete={() => remove(selected.id)} />
          )}
        </div>
      </div>
    </div>
  );
}

function EnquiryDetail({ enquiry, onPatch, onClose, onDelete }) {
  const [note, setNote] = useState(enquiry.admin_note || '');
  useEffect(() => { setNote(enquiry.admin_note || ''); }, [enquiry.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const replyHref = `mailto:${encodeURIComponent(enquiry.email)}?subject=${encodeURIComponent('Re: ' + (enquiry.subject || 'Your enquiry'))}&body=${encodeURIComponent('Hi ' + (enquiry.name || '') + ',\n\n')}`;

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-ink-500">Enquiry #{enquiry.id}</div>
          <div className="font-semibold text-ink-900">{enquiry.name}</div>
          <a href={`mailto:${enquiry.email}`} className="text-sm text-brand-600 hover:underline">{enquiry.email}</a>
          {enquiry.phone && <div className="text-sm text-ink-700">{enquiry.phone}</div>}
        </div>
        <button onClick={onClose} className="text-ink-500 hover:text-ink-700">✕</button>
      </div>

      <div className="mt-3 text-xs text-ink-500 space-y-0.5">
        <div>Status: <span className={`badge ${STATUS_STYLE[enquiry.status] || ''}`}>{enquiry.status}</span></div>
        {enquiry.subject     && <div>Subject: <b>{enquiry.subject}</b></div>}
        {enquiry.source_page && <div>From page: <code className="bg-ink-100 px-1 rounded">{enquiry.source_page}</code></div>}
        <div>Received: {enquiry.created_at}</div>
        {enquiry.responded_at && <div>Responded: {enquiry.responded_at}</div>}
      </div>

      <div className="mt-4">
        <div className="text-xs font-semibold uppercase text-ink-500 mb-1">Message</div>
        <div className="whitespace-pre-line text-sm text-ink-900 bg-ink-100 rounded-md p-3 max-h-72 overflow-y-auto">{enquiry.message}</div>
      </div>

      <div className="mt-4">
        <label className="label">Internal note (admin only)</label>
        <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What you want to remember about this enquiry…" />
        <button className="btn-ghost mt-2 text-xs" onClick={() => onPatch({ admin_note: note })}>Save note</button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <a href={replyHref} className="btn-primary text-xs">Reply by email</a>
        <button onClick={() => onPatch({ mark_responded: true, admin_note: note })} className="btn-ghost text-xs">Mark responded</button>
        <button onClick={() => onPatch({ status: 'archived' })} className="btn-ghost text-xs">Archive</button>
        <button onClick={onDelete} className="text-xs text-red-600 hover:underline ml-auto">Delete</button>
      </div>
    </div>
  );
}
