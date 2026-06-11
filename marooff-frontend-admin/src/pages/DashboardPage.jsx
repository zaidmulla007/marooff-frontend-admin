import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { fromMinor } from '../lib/money';

export default function DashboardPage() {
  const [stats, setStats] = useState({ products: '—', categories: '—', banners: '—' });
  const [orderStats, setOrderStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [p, c, b, os, recentR] = await Promise.all([
          api.get('/admin/products?limit=1').then((r) => r.meta?.total ?? 0),
          api.get('/admin/categories').then((r) => (r.payload || []).length),
          api.get('/admin/banners').then((r) => (r.payload || []).length),
          api.get('/admin/orders/stats').then((r) => r.payload).catch(() => null),
          api.get('/admin/orders?limit=8').then((r) => r.payload || []).catch(() => []),
        ]);
        setStats({ products: p, categories: c, banners: b });
        setOrderStats(os);
        setRecent(recentR);
      } catch (e) { setErr(e.message || 'Failed to load stats'); }
    }
    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Dashboard</h1>
      <p className="text-sm text-ink-500 mt-1">Overview of your Marooff store.</p>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      {/* Revenue + order counters */}
      {orderStats && (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile
            label="Lifetime revenue"
            value={fromMinor(orderStats.revenue_minor || 0)}
            sub="All non-cancelled orders"
            tone="brand-strong"
            href="/orders"
          />
          <StatTile
            label="Revenue today"
            value={fromMinor(orderStats.revenue_today_minor || 0)}
            sub={new Date().toLocaleDateString('en-GB')}
            href="/orders"
          />
          <StatTile
            label="New orders"
            value={orderStats.counts?.placed ?? 0}
            sub="Awaiting confirmation"
            tone="alert"
            href="/orders?status=placed"
          />
          <StatTile
            label="In transit"
            value={(orderStats.counts?.confirmed ?? 0) + (orderStats.counts?.shipped ?? 0)}
            sub={`Confirmed: ${orderStats.counts?.confirmed ?? 0} · Shipped: ${orderStats.counts?.shipped ?? 0}`}
            href="/orders?status=shipped"
          />
        </div>
      )}

      {/* Catalog summary */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CatalogTile label="Products"   value={stats.products}   href="/products" />
        <CatalogTile label="Categories" value={stats.categories} href="/categories" />
        <CatalogTile label="Banners"    value={stats.banners}    href="/banners" />
      </div>

      {/* Recent orders */}
      <div className="mt-8 card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-ink-100 bg-ink-100 flex items-center justify-between">
          <div className="font-medium">Recent orders</div>
          <Link to="/orders" className="text-xs text-brand-600 hover:underline">View all →</Link>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Order #</th><th>Placed</th><th>Customer</th><th>Status</th><th>Total</th><th></th>
            </tr>
          </thead>
          <tbody>
            {!recent.length && <tr><td colSpan={6} className="text-center text-ink-500 py-6">No orders yet — your first sale is on its way.</td></tr>}
            {recent.map((o) => (
              <tr key={o.id}>
                <td className="font-medium">{o.order_number}</td>
                <td className="text-xs text-ink-500 whitespace-nowrap">{(o.placed_at || '').replace('T', ' ').slice(0, 16)}</td>
                <td>
                  <div className="font-medium">{o.customer_name}</div>
                  <div className="text-xs text-ink-500">{o.customer_phone}</div>
                </td>
                <td><span className="badge bg-ink-100 text-ink-700">{o.status}</span></td>
                <td className="font-semibold whitespace-nowrap">{fromMinor(o.grand_total_minor, o.currency)}</td>
                <td className="text-right"><Link to={`/orders/${o.id}`} className="text-brand-600 hover:underline text-sm">Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, href, tone }) {
  const bg =
    tone === 'brand-strong' ? 'bg-brand-600 text-white' :
    tone === 'alert' ? 'bg-amber-50 border border-amber-200' :
    'bg-white';
  const labelColor = tone === 'brand-strong' ? 'text-white/80' : 'text-ink-500';
  const subColor   = tone === 'brand-strong' ? 'text-white/70' : 'text-ink-500';
  const valueColor = tone === 'brand-strong' ? '' : 'text-ink-900';
  return (
    <Link to={href} className={`block rounded-lg shadow-card p-5 hover:shadow-md transition ${bg}`}>
      <div className={`text-xs uppercase tracking-wide ${labelColor}`}>{label}</div>
      <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
      <div className={`mt-1 text-xs ${subColor}`}>{sub}</div>
    </Link>
  );
}

function CatalogTile({ label, value, href }) {
  return (
    <Link to={href} className="card p-5 hover:shadow-md transition block">
      <div className="text-sm text-ink-500">{label}</div>
      <div className="mt-2 text-3xl font-bold text-brand-600">{value}</div>
      <div className="mt-1 text-xs text-ink-500">Manage →</div>
    </Link>
  );
}
