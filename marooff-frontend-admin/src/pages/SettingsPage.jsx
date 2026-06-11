import { useEffect, useState } from 'react';
import { get, put } from '../lib/api';

const ANNOUNCEMENT_FIELDS = [
  ['announcement_1', 'Announcement #1'],
  ['announcement_2', 'Announcement #2'],
  ['announcement_3', 'Announcement #3'],
];

const STORE_FIELDS = [
  ['store_name',     'Store name'],
  ['store_tagline',  'Tagline'],
  ['support_email',  'Support email'],
  ['support_phone',  'Mobile number'],
  ['support_phone2', 'Landline number'],
  ['address',        'Address'],
  ['currency',       'Currency (3-letter)'],
  ['vat_pct',        'VAT %'],
];

export default function SettingsPage() {
  const [data, setData] = useState({});
  const [busy, setBusy] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try { setData((await get('/admin/settings')) || {}); }
      catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    })();
  }, []);

  function field(k, v) { setData((d) => ({ ...d, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const next = await put('/admin/settings', data);
      setData(next);
      setSavedAt(new Date().toLocaleTimeString());
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-ink-500 mt-1">Edit the storefront announcement bar, store info, and other public settings.</p>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={save} className="mt-6 space-y-6">
        {/* ===== Announcement bar ===== */}
        <section className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-semibold text-ink-900">Announcement bar</h2>
            <span className="text-xs text-ink-500">Top red strip on every storefront page</span>
          </div>
          <p className="text-sm text-ink-700 mb-4">
            These three messages scroll continuously across the top of the storefront. Leave any field blank to hide that message.
          </p>
          <div className="space-y-3">
            {ANNOUNCEMENT_FIELDS.map(([k, label]) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input
                  className="input"
                  value={data[k] ?? ''}
                  onChange={(e) => field(k, e.target.value)}
                  maxLength={140}
                  placeholder={`e.g. ${k === 'announcement_1' ? 'Free delivery in UAE on orders over AED 200' : k === 'announcement_2' ? 'Cash on Delivery available' : 'Call +971 55 3978656'}`}
                />
                <div className="text-xs text-ink-500 mt-1">{(data[k] ?? '').length} / 140</div>
              </div>
            ))}
          </div>

          {/* Live preview */}
          <div className="mt-5 rounded-md overflow-hidden border border-ink-200">
            <div className="px-3 py-1.5 text-xs text-ink-500 bg-ink-100">Preview</div>
            <div className="bg-brand-600 text-white text-sm py-2 px-4 overflow-hidden whitespace-nowrap">
              {[data.announcement_1, data.announcement_2, data.announcement_3]
                .filter((s) => s && s.trim())
                .map((s, i, arr) => (
                  <span key={i}>
                    {s}{i < arr.length - 1 ? <span className="px-3 opacity-60">·</span> : null}
                  </span>
                ))}
              {![data.announcement_1, data.announcement_2, data.announcement_3].some((s) => s && s.trim()) && (
                <span className="opacity-50">No announcements set — the bar will be hidden.</span>
              )}
            </div>
          </div>
        </section>

        {/* ===== Store info ===== */}
        <section className="card p-5">
          <h2 className="font-semibold text-ink-900 mb-3">Store information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {STORE_FIELDS.map(([k, label]) => (
              <div key={k} className={k === 'address' || k === 'store_tagline' ? 'sm:col-span-2' : ''}>
                <label className="label">{label}</label>
                <input className="input" value={data[k] ?? ''} onChange={(e) => field(k, e.target.value)} />
              </div>
            ))}
          </div>
        </section>

        {/* ===== Delivery / Shipping rules ===== */}
        <section className="card p-5">
          <h2 className="font-semibold text-ink-900 mb-1">Delivery charges</h2>
          <p className="text-sm text-ink-500 mb-4">
            Customers see "free delivery" once their cart subtotal crosses the threshold below.
            Otherwise the flat fee is added on checkout.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Free delivery above (AED)</label>
              <input
                className="input"
                type="number" step="0.01" min="0"
                value={(((data.shipping_free_above_minor ?? 7500) / 100)).toFixed(2)}
                onChange={(e) => field('shipping_free_above_minor', Math.round((parseFloat(e.target.value) || 0) * 100))}
              />
              <p className="text-xs text-ink-500 mt-1">
                Currently <strong>AED {(((data.shipping_free_above_minor ?? 7500) / 100)).toFixed(2)}</strong> — orders at or above this amount ship free.
              </p>
            </div>
            <div>
              <label className="label">Flat delivery fee (AED)</label>
              <input
                className="input"
                type="number" step="0.01" min="0"
                value={(((data.shipping_flat_fee_minor ?? 1000) / 100)).toFixed(2)}
                onChange={(e) => field('shipping_flat_fee_minor', Math.round((parseFloat(e.target.value) || 0) * 100))}
              />
              <p className="text-xs text-ink-500 mt-1">
                Currently <strong>AED {(((data.shipping_flat_fee_minor ?? 1000) / 100)).toFixed(2)}</strong> — charged when subtotal is below the threshold.
              </p>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save all settings'}</button>
          {savedAt && <span className="text-xs text-ink-500">Saved at {savedAt}</span>}
        </div>
      </form>
    </div>
  );
}
