import { useEffect, useState } from 'react';
import { api, del } from '../lib/api';

export default function NewsletterPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, last_page: 1, stats: { total: 0, active: 0, inactive: 0 } });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  async function load(page = 1, search = q, st = status) {
    setBusy(true);
    try {
      const r = await api.get('/admin/newsletter', { params: { page, limit: 50, q: search || undefined, status: st || undefined } });
      setRows(r.payload || []);
      setMeta(r.meta || { page, limit: 50, total: 0, last_page: 1, stats: { total: 0, active: 0, inactive: 0 } });
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(1, '', ''); }, []);

  // Auto-refresh when status filter changes (search waits for submit).
  useEffect(() => { load(1, q, status); /* eslint-disable-next-line */ }, [status]);

  async function unsubscribe(id, email, hard = false) {
    if (!window.confirm(hard
      ? `Permanently delete ${email}? This removes the record entirely.`
      : `Unsubscribe ${email}? Their email stays on file but they're flagged inactive.`)) return;
    try {
      await del(`/admin/newsletter/${id}${hard ? '?hard=1' : ''}`);
      load(meta.page, q, status);
    } catch (e) { alert(e.message); }
  }

  function downloadCsv() {
    const tok = localStorage.getItem('marooff_admin_token');
    fetch(api.defaults.baseURL + '/admin/newsletter/export', {
      headers: { Authorization: `Bearer ${tok}` },
    }).then(async (r) => {
      if (!r.ok) { alert('Export failed.'); return; }
      const blob = await r.blob();
      const url  = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `marooff-newsletter-${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Newsletter subscribers</h1>
          <p className="text-sm text-ink-500 mt-1">People who signed up for the "Get 10% off your first order" form on the storefront.</p>
        </div>
        <button onClick={downloadCsv} className="btn-primary text-sm">⬇ Download CSV</button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-3 gap-3 mt-5">
        <div className="card p-4">
          <div className="text-xs uppercase text-ink-500">Total</div>
          <div className="text-2xl font-semibold mt-1">{meta.stats?.total ?? 0}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase text-green-700">Active</div>
          <div className="text-2xl font-semibold mt-1">{meta.stats?.active ?? 0}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs uppercase text-ink-500">Unsubscribed</div>
          <div className="text-2xl font-semibold mt-1">{meta.stats?.inactive ?? 0}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mt-5 p-4">
        <form onSubmit={(e) => { e.preventDefault(); load(1, q.trim(), status); }} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Search email</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="e.g. layla@…" value={q} onChange={(e) => setQ(e.target.value)} />
              <button type="submit" className="btn-ghost">Go</button>
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="active">Active only</option>
              <option value="inactive">Unsubscribed only</option>
            </select>
          </div>
        </form>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Source</th>
              <th>Lang</th>
              <th>Subscribed</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {busy && <tr><td colSpan={6} className="text-center text-ink-500 py-6">Loading…</td></tr>}
            {!busy && rows.length === 0 && <tr><td colSpan={6} className="text-center text-ink-500 py-6">No subscribers yet.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="font-medium">{r.email}</td>
                <td className="text-xs">{r.source || '—'}</td>
                <td className="text-xs uppercase">{r.language || '—'}</td>
                <td className="text-xs text-ink-500">{r.created_at}</td>
                <td>{Number(r.is_active) ? <span className="badge bg-green-100 text-green-700">Active</span> : <span className="badge bg-ink-100 text-ink-700">Unsubscribed</span>}</td>
                <td className="text-right whitespace-nowrap">
                  {Number(r.is_active) ? (
                    <button onClick={() => unsubscribe(r.id, r.email, false)} className="text-xs text-ink-700 hover:underline mr-3">Unsubscribe</button>
                  ) : null}
                  <button onClick={() => unsubscribe(r.id, r.email, true)} className="text-xs text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center gap-2 justify-end text-sm">
          <button className="btn-ghost" disabled={meta.page <= 1} onClick={() => load(meta.page - 1, q, status)}>← Prev</button>
          <span className="text-ink-500">Page {meta.page} of {meta.last_page}</span>
          <button className="btn-ghost" disabled={meta.page >= meta.last_page} onClick={() => load(meta.page + 1, q, status)}>Next →</button>
        </div>
      )}
    </div>
  );
}
