import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, get, post, put } from '../lib/api';
import { fromMinor, toMinor, minorToInputString } from '../lib/money';
import ImageUpload from '../components/ImageUpload';

const emptyForm = {
  slug: '', name: '', description: '', image_url: '',
  price_aed: '', sale_price_aed: '', currency: 'AED',
  stock: 0, is_active: 1, sort_order: 0,
};

export default function ComboEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [items, setItems] = useState([]); // {product_id, variant_id, qty, sort_order, name, image_url, sku, price_minor}
  const [picker, setPicker] = useState({ open: false, q: '', results: [], busy: false });
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        if (isNew) { setForm(emptyForm); setBusy(false); return; }
        const c = await get(`/admin/combos/${id}`);
        setForm({
          slug: c.slug || '', name: c.name || '', description: c.description || '',
          image_url: c.image_url || '',
          price_aed:      minorToInputString(c.price_minor),
          sale_price_aed: minorToInputString(c.sale_price_minor),
          currency: c.currency || 'AED',
          stock: c.stock || 0, is_active: c.is_active ? 1 : 0,
          sort_order: c.sort_order || 0,
        });
        setItems(c.items || []);
      } catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    })();
  }, [id, isNew]);

  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const totalRetail = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.price_minor || 0) * Number(it.qty || 1)), 0);
  }, [items]);
  const comboPriceMinor = toMinor(form.sale_price_aed || form.price_aed);
  const customerSaves = Math.max(0, totalRetail - comboPriceMinor);

  async function searchProducts(q) {
    setPicker((p) => ({ ...p, busy: true, q }));
    try {
      const r = await api.get('/admin/products', { params: { q, limit: 20 } });
      setPicker((p) => ({ ...p, results: r.payload || [], busy: false }));
    } catch (e) { alert(e.message); setPicker((p) => ({ ...p, busy: false })); }
  }

  function addItem(p) {
    if (items.some((it) => it.product_id === p.id)) {
      alert('Already in the combo.');
      return;
    }
    setItems((x) => [...x, {
      product_id: p.id,
      variant_id: null,
      qty: 1,
      sort_order: x.length,
      name: p.name,
      slug: p.slug,
      image_url: p.main_image_url,
      sku: p.sku,
      price_minor: p.sale_price_minor || p.price_minor,
    }]);
    setPicker({ open: false, q: '', results: [], busy: false });
  }

  function patchItem(idx, patch) {
    setItems((x) => x.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx) {
    setItems((x) => x.filter((_, i) => i !== idx).map((it, i) => ({ ...it, sort_order: i })));
  }

  function move(idx, dir) {
    const j = dir === 'up' ? idx - 1 : idx + 1;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    const a = next[idx]; next[idx] = next[j]; next[j] = a;
    setItems(next.map((it, i) => ({ ...it, sort_order: i })));
  }

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (!items.length) throw new Error('Add at least one product to the combo.');
      const body = {
        slug:             form.slug,
        name:             form.name,
        description:      form.description || null,
        image_url:        form.image_url   || null,
        price_minor:      toMinor(form.price_aed),
        sale_price_minor: form.sale_price_aed ? toMinor(form.sale_price_aed) : null,
        currency:         form.currency || 'AED',
        stock:            Number(form.stock) || 0,
        is_active:        form.is_active ? 1 : 0,
        sort_order:       Number(form.sort_order) || 0,
        items: items.map((it, i) => ({
          product_id: it.product_id,
          variant_id: it.variant_id,
          qty:        Number(it.qty) || 1,
          sort_order: i,
        })),
      };
      if (isNew) {
        const c = await post('/admin/combos', body);
        nav(`/combos/${c.id}`);
      } else {
        await put(`/admin/combos/${id}`, body);
        nav('/combos');
      }
    } catch (e) {
      setErr(e.message); setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New combo' : 'Edit combo'}</h1>
        <Link to="/combos" className="text-sm text-ink-500 hover:underline">← Back</Link>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={save} className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Combo name</label>
              <input className="input" value={form.name} onChange={(e) => field('name', e.target.value)} placeholder="e.g. Wedding Glow Kit" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slug</label>
                <input className="input" value={form.slug} onChange={(e) => field('slug', e.target.value)} placeholder="auto" />
              </div>
              <div>
                <label className="label">Stock (combos available)</label>
                <input className="input" type="number" min="0" value={form.stock} onChange={(e) => field('stock', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input min-h-[100px]" value={form.description} onChange={(e) => field('description', e.target.value)} placeholder="What's in this combo and why customers want it" />
            </div>
            <ImageUpload label="Combo image" value={form.image_url} onChange={(url) => field('image_url', url || '')} />
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold">Combo pricing</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Regular combo price (AED)</label>
                <input className="input" value={form.price_aed} onChange={(e) => field('price_aed', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Offer price (AED, blank if none)</label>
                <input className="input" value={form.sale_price_aed} onChange={(e) => field('sale_price_aed', e.target.value)} placeholder="leave blank" />
              </div>
            </div>
            {items.length > 0 && totalRetail > 0 && (
              <div className="text-sm rounded-md bg-brand-50 text-brand-700 px-3 py-2">
                Items sold separately would be <strong>{fromMinor(totalRetail, form.currency)}</strong>.
                {customerSaves > 0 && (
                  <> Customer saves <strong>{fromMinor(customerSaves, form.currency)}</strong> by buying the combo.</>
                )}
              </div>
            )}
          </div>

          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Combo contents</h2>
                <p className="text-xs text-ink-500">Add 3–4 products that go into this bundle.</p>
              </div>
              <button type="button" onClick={() => setPicker({ open: true, q: '', results: [], busy: false })} className="btn-ghost text-sm">+ Add product</button>
            </div>

            {!items.length ? (
              <p className="text-sm text-ink-500 italic">No products added yet.</p>
            ) : (
              <ul className="space-y-2">
                {items.map((it, i) => (
                  <li key={it.product_id} className="flex items-center gap-3 border border-ink-200 rounded p-2">
                    <div className="w-14 h-14 bg-ink-100 rounded overflow-hidden flex-shrink-0">
                      {it.image_url && <img src={it.image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{it.name}</div>
                      <div className="text-xs text-ink-500">{it.sku || '—'} · {fromMinor(it.price_minor || 0, form.currency)} each</div>
                    </div>
                    <div>
                      <label className="text-xs text-ink-500 block">Qty</label>
                      <input
                        className="input w-20"
                        type="number" min="1" step="1"
                        value={it.qty}
                        onChange={(e) => patchItem(i, { qty: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" disabled={i === 0}                onClick={() => move(i, 'up')}   className="text-xs w-7 h-7 rounded hover:bg-ink-100 disabled:opacity-30">▲</button>
                      <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 'down')} className="text-xs w-7 h-7 rounded hover:bg-ink-100 disabled:opacity-30">▼</button>
                    </div>
                    <button type="button" onClick={() => removeItem(i)} className="text-xs text-red-600 hover:bg-red-50 px-2 h-7 rounded">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold">Status</h2>
            <div>
              <label className="label">Visibility</label>
              <select className="input" value={form.is_active ? '1' : '0'} onChange={(e) => field('is_active', Number(e.target.value))}>
                <option value="1">Live on storefront</option>
                <option value="0">Hidden</option>
              </select>
            </div>
            <div>
              <label className="label">Display order</label>
              <input className="input" type="number" value={form.sort_order} onChange={(e) => field('sort_order', e.target.value)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save combo'}</button>
            <Link to="/combos" className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>

      {/* ----- Product picker modal ----- */}
      {picker.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-20" onClick={() => setPicker({ open: false, q: '', results: [], busy: false })}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-3 border-b border-ink-100 flex items-center justify-between">
              <h3 className="font-semibold">Pick a product to add</h3>
              <button type="button" onClick={() => setPicker({ open: false, q: '', results: [], busy: false })} className="text-ink-500 hover:text-ink-900">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <form onSubmit={(e) => { e.preventDefault(); searchProducts(picker.q); }} className="flex gap-2">
                <input className="input flex-1" autoFocus placeholder="Search by name, SKU, brand" value={picker.q} onChange={(e) => setPicker((p) => ({ ...p, q: e.target.value }))} />
                <button className="btn-primary">Search</button>
              </form>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {picker.busy && <div className="text-sm text-ink-500 py-3 text-center">Searching…</div>}
                {!picker.busy && picker.results.length === 0 && <div className="text-sm text-ink-500 py-3 text-center">No matches yet — type and press Search.</div>}
                {picker.results.map((p) => (
                  <button type="button" key={p.id} onClick={() => addItem(p)} className="w-full text-left flex items-center gap-3 border border-ink-200 rounded p-2 hover:bg-ink-100/50">
                    <div className="w-10 h-10 bg-ink-100 rounded overflow-hidden flex-shrink-0">
                      {p.main_image_url && <img src={p.main_image_url} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-ink-500">{p.sku || '—'} · {fromMinor(p.price_minor, p.currency)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
