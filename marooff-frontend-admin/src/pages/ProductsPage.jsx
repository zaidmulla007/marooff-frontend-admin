import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, del, get } from '../lib/api';
import { fromMinor } from '../lib/money';

const SORT_OPTIONS = [
  { value: 'new',        label: 'Newest first' },
  { value: 'oldest',     label: 'Oldest first' },
  { value: 'position',   label: 'Position in category (1, 2, 3…)' },
  { value: 'name_asc',   label: 'Name A → Z' },
  { value: 'name_desc',  label: 'Name Z → A' },
  { value: 'price_asc',  label: 'Price low → high' },
  { value: 'price_desc', label: 'Price high → low' },
  { value: 'stock_asc',  label: 'Stock low → high' },
  { value: 'stock_desc', label: 'Stock high → low' },
];

const STATUS_OPTIONS = [
  { value: '',       label: 'All statuses' },
  { value: 'live',   label: 'Live only' },
  { value: 'hidden', label: 'Hidden only' },
];

export default function ProductsPage() {
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 24, total: 0, last_page: 1 });
  const [q, setQ] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('new');
  const [flags, setFlags] = useState({ featured: false, new: false, bestseller: false, low_stock: false });
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  // Flatten parent + children into a single dropdown list (indent children with —).
  const categoryOptions = useMemo(() => {
    const out = [];
    function walk(list, depth = 0) {
      for (const c of list || []) {
        out.push({ id: c.id, label: `${'— '.repeat(depth)}${c.name}` });
        if (c.children?.length) walk(c.children, depth + 1);
      }
    }
    walk(categories);
    return out;
  }, [categories]);

  // Load categories once for the filter dropdown.
  useEffect(() => {
    (async () => {
      try {
        const cats = await get('/admin/categories');
        setCategories(cats || []);
      } catch {}
    })();
  }, []);

  async function load(page = 1, overrides = {}) {
    setBusy(true);
    try {
      const params = {
        page,
        limit: 24,
        q:           (overrides.q           ?? q)          || undefined,
        category_id: (overrides.categoryId  ?? categoryId) || undefined,
        status:      (overrides.status      ?? status)     || undefined,
        sort:        (overrides.sort        ?? sort)       || undefined,
      };
      const f = overrides.flags ?? flags;
      if (f.featured)   params.featured   = 1;
      if (f.new)        params.new        = 1;
      if (f.bestseller) params.bestseller = 1;
      if (f.low_stock)  params.low_stock  = 5;     // ≤ 5 in stock counts as low
      const r = await api.get('/admin/products', { params });
      setRows(r.payload || []);
      setMeta(r.meta || { page, limit: 24, total: 0, last_page: 1 });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => { load(1, {}); }, []);

  // Re-fetch whenever a filter/sort changes (except free-text search, which submits on its own).
  useEffect(() => {
    load(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId, status, sort, flags.featured, flags.new, flags.bestseller, flags.low_stock]);

  // When the user picks a category, auto-switch the sort to "position" — that's
  // the order that controls the storefront for that category. They can override
  // by changing the Sort dropdown after.
  useEffect(() => {
    if (categoryId && sort === 'new') setSort('position');
    if (!categoryId && sort === 'position') setSort('new');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  async function remove(id) {
    if (!window.confirm('Delete this product? It will also remove its images.')) return;
    try { await del(`/admin/products/${id}`); load(meta.page); }
    catch (e) { alert(e.message); }
  }

  function onSearch(e) {
    e.preventDefault();
    load(1);
  }

  function clearFilters() {
    setQ(''); setCategoryId(''); setStatus(''); setSort('new');
    setFlags({ featured: false, new: false, bestseller: false, low_stock: false });
  }

  const hasFilters = !!(q || categoryId || status || sort !== 'new' || flags.featured || flags.new || flags.bestseller || flags.low_stock);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Products <span className="text-sm font-normal text-ink-500">({meta.total})</span></h1>
        <Link to="/products/new" className="btn-primary">+ New product</Link>
      </div>

      {/* ===== Filter bar ===== */}
      <div className="card mt-4 p-4 space-y-3">
        <form onSubmit={onSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="label">Search</label>
            <div className="flex gap-2">
              <input className="input flex-1" placeholder="Name / SKU / brand" value={q} onChange={(e) => setQ(e.target.value)} />
              <button className="btn-ghost" type="submit">Go</button>
            </div>
          </div>

          <div>
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">All categories</option>
              {categoryOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Status</label>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Sort by</label>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </form>

        <div className="flex items-center flex-wrap gap-2 pt-1">
          <span className="text-xs text-ink-500 mr-1">Quick filters:</span>
          {[
            ['featured',   'Featured'],
            ['new',        'New arrivals'],
            ['bestseller', 'Bestsellers'],
            ['low_stock',  'Low stock (≤5)'],
          ].map(([k, label]) => (
            <button
              type="button"
              key={k}
              onClick={() => setFlags((f) => ({ ...f, [k]: !f[k] }))}
              className={`text-xs px-3 py-1 rounded-full border transition ${flags[k] ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-ink-700 border-ink-300 hover:border-brand-500'}`}
            >
              {label}
            </button>
          ))}
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="text-xs text-red-600 hover:underline ml-2">Clear all filters</button>
          )}
        </div>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Image</th>
              <th>Name</th>
              <th>SKU</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Flags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {busy && <tr><td colSpan={8} className="text-center text-ink-500 py-6">Loading…</td></tr>}
            {!busy && rows.length === 0 && <tr><td colSpan={8} className="text-center text-ink-500 py-6">No products match these filters.</td></tr>}
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  {Number(p.position) > 0
                    ? <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">{p.position}</span>
                    : <span className="text-xs text-ink-500">—</span>}
                </td>
                <td><div className="w-12 h-12 rounded bg-ink-100 overflow-hidden">{p.main_image_url && <img src={p.main_image_url} className="w-full h-full object-cover" alt="" />}</div></td>
                <td>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-ink-500">{p.slug}</div>
                </td>
                <td className="text-xs">{p.sku}</td>
                <td>{fromMinor(p.price_minor, p.currency)}</td>
                <td className={p.stock <= 5 ? 'text-red-600 font-semibold' : ''}>{p.stock}</td>
                <td className="space-x-1">
                  {Number(p.is_active) === 1
                    ? <span className="badge bg-green-100 text-green-700">Live</span>
                    : <span className="badge bg-ink-100 text-ink-700">Off</span>}
                  {Number(p.is_featured)   === 1 && <span className="badge bg-amber-100 text-amber-700">Feat</span>}
                  {Number(p.is_new)        === 1 && <span className="badge bg-brand-50 text-brand-700">New</span>}
                  {Number(p.is_bestseller) === 1 && <span className="badge bg-pink-100 text-pink-700">Best</span>}
                </td>
                <td className="text-right whitespace-nowrap">
                  <Link to={`/products/${p.id}`} className="text-brand-600 hover:underline text-sm mr-3">Edit</Link>
                  <button onClick={() => remove(p.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div className="mt-4 flex items-center gap-2 justify-end text-sm">
          <button className="btn-ghost" disabled={meta.page <= 1} onClick={() => load(meta.page - 1)}>← Prev</button>
          <span className="text-ink-500">Page {meta.page} of {meta.last_page}</span>
          <button className="btn-ghost" disabled={meta.page >= meta.last_page} onClick={() => load(meta.page + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
