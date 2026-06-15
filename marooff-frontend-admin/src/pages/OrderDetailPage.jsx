import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../lib/api';
import { fromMinor } from '../lib/money';

const STATUSES = ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'];

const STATUS_STYLE = {
  placed:    'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-700',
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setBusy(true); setErr('');
    try { setOrder((await api.get(`/admin/orders/${id}`)).payload); }
    catch (e) { setErr(e.message || ''); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function setStatus(next, reason) {
    try {
      await api.patch(`/admin/orders/${id}/status`, { status: next, reason });
      load();
    } catch (e) { alert(e.message || ''); }
  }

  if (busy)  return <div className="text-ink-500">Loading…</div>;
  if (err)   return <div className="rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>;
  if (!order) return null;

  const a = order.shipping_address;

  return (
    <div className="print-area">
      {/* Print-only header (hidden on screen, shown when printing) */}
      <div className="hidden print:block mb-4">
        <div className="flex items-center justify-between border-b border-ink-200 pb-2">
          <div>
            <div className="font-serif text-2xl font-bold text-brand-700">Marooff</div>
            <div className="text-xs text-ink-500">Maroof Fakhree Centre L.L.C. · Deira, Dubai, UAE</div>
          </div>
          <div className="text-right text-xs text-ink-500">
            <div>Printed {new Date().toISOString().slice(0,16).replace('T', ' ')}</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <Link to="/orders" className="text-sm text-ink-500 hover:underline print:hidden">← Back to orders</Link>
          <h1 className="text-2xl font-semibold mt-1">{order.order_number}</h1>
          <div className="text-sm text-ink-500">Placed {(order.placed_at || '').replace('T', ' ').slice(0, 16)}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`badge ${STATUS_STYLE[order.status] || ''}`}>{order.status}</span>
          <span className="badge bg-ink-100 text-ink-700 uppercase">{order.payment_method} · {order.payment_status}</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="print:hidden text-sm font-semibold bg-brand-600 text-white rounded-md px-4 py-1.5 hover:bg-brand-700 inline-flex items-center gap-2"
            title="Print or save as PDF (Ctrl+P → Save as PDF)"
          >
            🖨 Print / PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        {/* Items */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-4 py-3 border-b border-ink-100 bg-ink-100 font-medium">Items ({(order.items || []).length})</div>
          <ul className="divide-y divide-ink-100">
            {(order.items || []).map((it) => (
              <li key={it.id} className="flex gap-3 p-4">
                <div className="w-16 h-16 bg-ink-100 rounded overflow-hidden shrink-0">
                  {it.image_snapshot && <img src={it.image_snapshot} alt={it.name_snapshot} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{it.name_snapshot}</div>
                  <div className="text-xs text-ink-500">{it.shade_snapshot ? `${it.shade_snapshot} · ` : ''}{it.sku_snapshot ?? ''}</div>
                  <div className="text-xs text-ink-500 mt-1">Qty {it.qty} × {fromMinor(it.unit_price_minor, order.currency)}</div>
                </div>
                <div className="text-sm font-semibold whitespace-nowrap">{fromMinor(it.line_total_minor, order.currency)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Totals + customer + status changer */}
        <div className="space-y-4">
          <div className="card p-5 print:hidden">
            <h2 className="font-semibold mb-3">Totals</h2>
            <dl className="text-sm space-y-1">
              <Row label="Subtotal" value={fromMinor(order.subtotal_minor, order.currency)} />
              {order.discount_minor > 0 && <Row label="Discount" value={`− ${fromMinor(order.discount_minor, order.currency)}`} />}
              <Row label="Shipping" value={order.shipping_fee_minor === 0 ? 'Free' : fromMinor(order.shipping_fee_minor, order.currency)} />
              {order.cod_fee_minor > 0 && <Row label="COD fee" value={fromMinor(order.cod_fee_minor, order.currency)} />}
              <Row label="VAT (incl.)" value={fromMinor(order.vat_minor, order.currency)} muted />
              <hr className="border-ink-100 my-1" />
              <Row label="Grand total" value={fromMinor(order.grand_total_minor, order.currency)} bold />
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-2">Customer</h2>
            <div className="text-sm">
              <div className="font-medium">{order.customer_name}</div>
              <a href={`mailto:${order.customer_email}`} className="text-brand-600 hover:underline">{order.customer_email}</a>
              <div>{order.customer_phone}</div>
            </div>
          </div>

          {a && (
            <div className="card p-5">
              <h2 className="font-semibold mb-2">Shipping address</h2>
              <address className="not-italic text-sm text-ink-700 leading-relaxed">
                <div className="font-medium text-ink-900">{a.name}</div>
                <div>{a.phone}</div>
                <div>{[a.apartment, a.floor && `Fl ${a.floor}`, a.building, a.street].filter(Boolean).join(', ')}</div>
                <div>{[a.area, a.emirate].filter(Boolean).join(', ')}</div>
                {a.landmark && <div className="text-xs text-ink-500">Near {a.landmark}</div>}
                {a.makani && <div className="text-xs text-ink-500">Makani: {a.makani}</div>}
              </address>
            </div>
          )}

          {order.notes && (
            <div className="card p-5">
              <h2 className="font-semibold mb-2">Customer note</h2>
              <p className="text-sm text-ink-700 whitespace-pre-line">{order.notes}</p>
            </div>
          )}

          <div className="card p-5 print:hidden">
            <h2 className="font-semibold mb-2">Update status</h2>
            <div className="flex flex-wrap gap-2 text-sm">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    if (s === 'cancelled' || s === 'refunded') {
                      const reason = window.prompt(`Reason for marking ${s}?`, '');
                      if (reason === null) return;
                      setStatus(s, reason);
                    } else {
                      setStatus(s);
                    }
                  }}
                  disabled={order.status === s}
                  className={`px-3 py-1.5 rounded-full border text-sm transition ${order.status === s ? 'bg-brand-600 text-white border-brand-600 cursor-default' : 'bg-white text-ink-700 border-ink-300 hover:border-brand-500'}`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-xs text-ink-500 mt-3">
              Marking <code>delivered</code> automatically flags COD payment as paid.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }) {
  return (
    <div className={`flex justify-between ${muted ? 'text-ink-500' : ''} ${bold ? 'text-base' : ''}`}>
      <dt>{label}</dt>
      <dd className={`${bold ? 'font-bold text-brand-700' : 'font-medium'}`}>{value}</dd>
    </div>
  );
}
