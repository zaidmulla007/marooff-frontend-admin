import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, del } from '../lib/api';
import { fromMinor } from '../lib/money';

export default function CombosPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 24, total: 0, last_page: 1 });
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  async function load(page = 1, search = '') {
    setBusy(true);
    try {
      const r = await api.get('/admin/combos', { params: { page, limit: 24, q: search || undefined } });
      setRows(r.payload || []);
      setMeta(r.meta || { page, limit: 24, total: 0, last_page: 1 });
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  useEffect(() => { load(1, ''); }, []);

  async function remove(id) {
    if (!window.confirm('Delete this combo? Customers will no longer see it.')) return;
    try { await del(`/admin/combos/${id}`); load(meta.page, q); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Combo bundles <span className="text-sm font-normal text-ink-500">({meta.total})</span></h1>
        <div className="flex gap-2">
          <form onSubmit={(e) => { e.preventDefault(); load(1, q.trim()); }} className="flex gap-2">
            <input className="input w-64" placeholder="Search name / slug" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-ghost">Search</button>
          </form>
          <Link to="/combos/new" className="btn-primary">+ New combo</Link>
        </div>
      </div>
      <p className="text-sm text-ink-500 mt-1">Bundle 3–4 products together and sell them at a special combo price.</p>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {busy && <tr><td colSpan={7} className="text-center text-ink-500 py-6">Loading…</td></tr>}
            {!busy && rows.length === 0 && <tr><td colSpan={7} className="text-center text-ink-500 py-6">No combos yet. Click "+ New combo" to create one.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id}>
                <td><div className="w-12 h-12 rounded bg-ink-100 overflow-hidden">{c.image_url && <img src={c.image_url} className="w-full h-full object-cover" alt="" />}</div></td>
                <td className="font-medium">{c.name}</td>
                <td className="text-xs text-ink-500">{c.slug}</td>
                <td>
                  {c.sale_price_minor && c.sale_price_minor < c.price_minor ? (
                    <span>
                      <span className="font-semibold text-brand-700">{fromMinor(c.sale_price_minor, c.currency)}</span>
                      <span className="text-xs line-through text-ink-500 ml-2">{fromMinor(c.price_minor, c.currency)}</span>
                    </span>
                  ) : (
                    fromMinor(c.price_minor, c.currency)
                  )}
                </td>
                <td>{c.stock}</td>
                <td>{c.is_active ? <span className="badge bg-green-100 text-green-700">Live</span> : <span className="badge bg-ink-100 text-ink-700">Hidden</span>}</td>
                <td className="text-right whitespace-nowrap">
                  <Link to={`/combos/${c.id}`} className="text-brand-600 hover:underline text-sm mr-3">Edit</Link>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center gap-2 justify-end text-sm">
          <button className="btn-ghost" disabled={meta.page <= 1} onClick={() => load(meta.page - 1, q)}>← Prev</button>
          <span className="text-ink-500">Page {meta.page} of {meta.last_page}</span>
          <button className="btn-ghost" disabled={meta.page >= meta.last_page} onClick={() => load(meta.page + 1, q)}>Next →</button>
        </div>
      )}
    </div>
  );
}
