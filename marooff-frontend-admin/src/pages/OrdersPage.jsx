import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fromMinor } from '../lib/money';

const STATUSES = [
  { key: '',          label: 'All' },
  { key: 'placed',    label: 'New' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'shipped',   label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'refunded',  label: 'Refunded' },
];

const STATUS_STYLE = {
  placed:    'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-700',
};

export default function OrdersPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0, last_page: 1, counts: { total: 0 } });
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  const load = useCallback(async (page = 1) => {
    setBusy(true); setErr('');
    try {
      const r = await api.get('/admin/orders', { params: { page, limit: 20, status: status || undefined, q: q || undefined } });
      setRows(r.payload || []);
      setMeta(r.meta || { page, limit: 20, total: 0, last_page: 1, counts: { total: 0 } });
    } catch (e) {
      setErr(e.message || 'Failed to load orders');
    } finally { setBusy(false); }
  }, [status, q]);

  useEffect(() => { load(1); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = meta.counts || { total: 0, placed: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Orders <span className="text-sm font-normal text-ink-500">({meta.total})</span></h1>
        <form onSubmit={(e) => { e.preventDefault(); load(1); }} className="flex gap-2">
          <input className="input w-64" placeholder="Search order # / name / email / phone" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn-ghost">Search</button>
        </form>
      </div>

      {/* Status tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((opt) => {
          const count = opt.key ? (c[opt.key] ?? 0) : (c.total ?? 0);
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

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th>
              <th>Placed</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {busy && <tr><td colSpan={7} className="text-center text-ink-500 py-6">Loading…</td></tr>}
            {!busy && !rows.length && <tr><td colSpan={7} className="text-center text-ink-500 py-6">No orders match.</td></tr>}
            {rows.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.order_number}</td>
                <td className="text-xs text-ink-500 whitespace-nowrap">{(o.placed_at || '').replace('T', ' ').slice(0, 16)}</td>
                <td>
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-ink-500">{o.customer_email} · {o.customer_phone}</div>
                </td>
                <td><span className={`badge ${STATUS_STYLE[o.status] || ''}`}>{o.status}</span></td>
                <td className="text-xs uppercase">{o.payment_method} · <span className="text-ink-500">{o.payment_status}</span></td>
                <td className="font-semibold whitespace-nowrap">{fromMinor(o.grand_total_minor, o.currency)}</td>
                <td className="text-right whitespace-nowrap">
                  <Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline text-sm">Open</Link>
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
    </div>
  );
}
