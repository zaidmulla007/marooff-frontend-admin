import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fromMinor } from '../lib/money';

const STATUS_TONES = {
  placed:    'bg-amber-100 text-amber-700',
  confirmed: 'bg-blue-100 text-blue-700',
  shipped:   'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded:  'bg-gray-100 text-gray-700',
};

export default function SalesPage() {
  const [summary, setSummary] = useState(null);
  const [series, setSeries]   = useState([]);
  const [days, setDays]       = useState(30);
  const [err, setErr]         = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true); setErr('');
    Promise.all([
      api.get('/admin/sales/summary'),
      api.get(`/admin/sales/series?days=${days}`),
    ])
      .then(([sumR, serR]) => {
        if (!alive) return;
        setSummary(sumR.payload);
        setSeries(serR.payload?.series || []);
      })
      .catch((e) => { if (alive) setErr(e?.message || 'Failed to load sales'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">Sales</h1>
          <p className="text-sm text-ink-500 mt-1">Everything customers have bought — revenue, top products, top customers.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-ink-500">Trend window:</span>
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={
                'px-3 py-1 rounded-md border text-xs font-medium ' +
                (days === d ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-200 hover:border-brand-500')
              }
            >{d} days</button>
          ))}
        </div>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}
      {loading && <div className="mt-6 text-ink-500">Loading sales…</div>}

      {summary && (
        <>
          {/* KPI tiles */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiTile label="Lifetime revenue" value={fromMinor(summary.revenue.total_minor)} sub="Cancelled / refunded excluded" tone="brand-strong" />
            <KpiTile label="Last 30 days"     value={fromMinor(summary.revenue.last_30d_minor)} sub={`Today: ${fromMinor(summary.revenue.today_minor)}`} />
            <KpiTile label="Average order"    value={fromMinor(summary.revenue.aov_minor)} sub={`${summary.counts.total} orders · ${summary.customers.unique_buyers} buyers`} />
            <KpiTile label="New orders"       value={summary.counts.placed} sub="Awaiting confirmation" tone="alert" href="/orders?status=placed" />
          </div>

          {/* Two-up: chart + payment split */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card p-5 lg:col-span-2">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-medium text-ink-900">Revenue · last {days} days</h2>
                <div className="text-xs text-ink-500">All bars are in AED · cancelled orders excluded</div>
              </div>
              <RevenueChart series={series} />
            </div>
            <div className="card p-5">
              <h2 className="font-medium text-ink-900 mb-3">Payment method</h2>
              <PaymentSplit payment={summary.payment} totalRevenue={summary.revenue.total_minor} />
              <div className="mt-5 pt-4 border-t border-ink-100">
                <h3 className="text-xs uppercase tracking-wide text-ink-500 mb-2">Orders by status</h3>
                <ul className="space-y-1.5 text-sm">
                  {Object.entries(summary.counts).filter(([k]) => k !== 'total').map(([k, v]) => (
                    <li key={k} className="flex justify-between">
                      <span className={`badge ${STATUS_TONES[k] || 'bg-ink-100 text-ink-700'}`}>{k}</span>
                      <span className="font-medium">{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Two-up: top products + top customers */}
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-100 font-medium">Top products</div>
              <table className="table">
                <thead>
                  <tr><th>Product</th><th>Units sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {!summary.top_products.length && <tr><td colSpan={3} className="text-center text-ink-500 py-5">No sales yet.</td></tr>}
                  {summary.top_products.map((p) => (
                    <tr key={p.product_id}>
                      <td>
                        <Link to={`/products/${p.product_id}`} className="font-medium text-brand-700 hover:underline">{p.name}</Link>
                      </td>
                      <td className="font-medium">{p.units}</td>
                      <td className="font-semibold whitespace-nowrap">{fromMinor(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-ink-100 bg-ink-100 font-medium">Top customers</div>
              <table className="table">
                <thead>
                  <tr><th>Customer</th><th>Orders</th><th>Lifetime spend</th></tr>
                </thead>
                <tbody>
                  {!summary.top_customers.length && <tr><td colSpan={3} className="text-center text-ink-500 py-5">No customers yet.</td></tr>}
                  {summary.top_customers.map((c) => (
                    <tr key={c.user_id}>
                      <td>
                        <div className="font-medium">{c.customer_name}</div>
                        <div className="text-xs text-ink-500">{c.customer_email}</div>
                      </td>
                      <td className="font-medium">{c.orders_count}</td>
                      <td className="font-semibold whitespace-nowrap">{fromMinor(c.spend)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent orders */}
          <div className="mt-6 card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-ink-100 bg-ink-100 flex items-center justify-between">
              <div className="font-medium">Recent orders</div>
              <Link to="/orders" className="text-xs text-brand-600 hover:underline">View all →</Link>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th><th>Placed</th><th>Customer</th><th>Pay</th><th>Status</th><th>Total</th><th></th>
                </tr>
              </thead>
              <tbody>
                {!summary.recent_orders.length && <tr><td colSpan={7} className="text-center text-ink-500 py-6">No orders yet.</td></tr>}
                {summary.recent_orders.map((o) => (
                  <tr key={o.id}>
                    <td className="font-medium">{o.order_number}</td>
                    <td className="text-xs text-ink-500 whitespace-nowrap">{(o.placed_at || '').replace('T', ' ').slice(0, 16)}</td>
                    <td>
                      <div className="font-medium">{o.customer_name}</div>
                      <div className="text-xs text-ink-500">{o.customer_phone}</div>
                    </td>
                    <td>
                      <span className="badge bg-ink-100 text-ink-700">{o.payment_method.toUpperCase()}</span>
                      <div className="text-xs text-ink-500 mt-0.5">{o.payment_status}</div>
                    </td>
                    <td><span className={`badge ${STATUS_TONES[o.status] || 'bg-ink-100 text-ink-700'}`}>{o.status}</span></td>
                    <td className="font-semibold whitespace-nowrap">{fromMinor(o.grand_total_minor, o.currency)}</td>
                    <td className="text-right"><Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline text-sm">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function KpiTile({ label, value, sub, tone, href }) {
  const bg =
    tone === 'brand-strong' ? 'bg-brand-600 text-white' :
    tone === 'alert' ? 'bg-amber-50 border border-amber-200' :
    'bg-white';
  const labelColor = tone === 'brand-strong' ? 'text-white/80' : 'text-ink-500';
  const subColor   = tone === 'brand-strong' ? 'text-white/70' : 'text-ink-500';
  const valueColor = tone === 'brand-strong' ? '' : 'text-ink-900';
  const Wrap = href ? Link : 'div';
  const wrapProps = href ? { to: href } : {};
  return (
    <Wrap {...wrapProps} className={`block rounded-lg shadow-card p-5 ${bg} ${href ? 'hover:shadow-md transition' : ''}`}>
      <div className={`text-xs uppercase tracking-wide ${labelColor}`}>{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
      <div className={`mt-1 text-xs ${subColor}`}>{sub}</div>
    </Wrap>
  );
}

function RevenueChart({ series }) {
  const max = useMemo(() => Math.max(1, ...series.map((s) => s.revenue || 0)), [series]);
  if (!series.length) return <div className="text-sm text-ink-500 py-10 text-center">No data in this window.</div>;
  return (
    <div className="flex items-end gap-1 h-44">
      {series.map((s) => {
        const pct = Math.round(((s.revenue || 0) / max) * 100);
        return (
          <div key={s.date} className="flex-1 flex flex-col items-center group relative">
            <div
              className={`w-full rounded-t ${s.revenue ? 'bg-brand-600' : 'bg-ink-100'} hover:bg-brand-700 transition`}
              style={{ height: `${Math.max(2, pct)}%` }}
              title={`${s.date} · ${fromMinor(s.revenue)} · ${s.orders} order${s.orders === 1 ? '' : 's'}`}
            />
          </div>
        );
      })}
    </div>
  );
}

function PaymentSplit({ payment, totalRevenue }) {
  const total = (payment.cod.revenue || 0) + (payment.stripe.revenue || 0);
  const codPct    = total ? Math.round((payment.cod.revenue    / total) * 100) : 0;
  const stripePct = total ? 100 - codPct : 0;
  return (
    <div>
      <div className="h-3 rounded-full overflow-hidden bg-ink-100 flex">
        <div className="bg-brand-600 h-full" style={{ width: `${codPct}%` }} />
        <div className="bg-blue-500 h-full"  style={{ width: `${stripePct}%` }} />
      </div>
      <div className="mt-3 text-sm space-y-1.5">
        <div className="flex justify-between">
          <span><span className="inline-block w-2 h-2 bg-brand-600 rounded-sm mr-1.5" />Cash on delivery</span>
          <span className="font-medium">{fromMinor(payment.cod.revenue)} <span className="text-xs text-ink-500">· {payment.cod.orders} orders</span></span>
        </div>
        <div className="flex justify-between">
          <span><span className="inline-block w-2 h-2 bg-blue-500 rounded-sm mr-1.5" />Card (Stripe)</span>
          <span className="font-medium">{fromMinor(payment.stripe.revenue)} <span className="text-xs text-ink-500">· {payment.stripe.orders} orders</span></span>
        </div>
      </div>
    </div>
  );
}
