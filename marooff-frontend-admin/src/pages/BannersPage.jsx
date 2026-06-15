import { useEffect, useState } from 'react';
import { get, post, put, del } from '../lib/api';
import ImageUpload from '../components/ImageUpload';

const empty = { placement: 'home_hero', title: '', subtitle: '', image_url: '', link_url: '', sort_order: 0, is_active: 1 };

export default function BannersPage() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const [draft, setDraft] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setBusy(true);
    try { setRows(await get('/admin/banners') || []); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    setErr('');
    try {
      if (editingId) await put(`/admin/banners/${editingId}`, draft);
      else           await post('/admin/banners', draft);
      setDraft(empty); setEditingId(null);
      load();
    } catch (e) { setErr(e.message); }
  }

  function edit(b) {
    setDraft({ ...b, is_active: Number(b.is_active) === 1 ? 1 : 0 });
    setEditingId(b.id);
  }

  async function remove(id) {
    if (!window.confirm('Delete this banner?')) return;
    try { await del(`/admin/banners/${id}`); load(); }
    catch (e) { alert(e.message); }
  }

  function field(k, v) { setDraft((d) => ({ ...d, [k]: v })); }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Banners</h1>
      <p className="text-sm text-ink-500 mt-1">Hero slides shown on the storefront home page.</p>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <form onSubmit={save} className="card p-5 space-y-3 lg:col-span-1">
          <h2 className="font-semibold">{editingId ? `Edit banner #${editingId}` : 'New banner'}</h2>
          <div>
            <label className="label">Placement</label>
            <select className="input" value={draft.placement} onChange={(e) => field('placement', e.target.value)}>
              <option value="home_hero">Home — hero slider</option>
              <option value="home_strip">Home — promo strip</option>
              <option value="category_top">Category page top</option>
            </select>
          </div>
          <div><label className="label">Title</label><input className="input" value={draft.title || ''} onChange={(e) => field('title', e.target.value)} /></div>
          <div><label className="label">Subtitle</label><input className="input" value={draft.subtitle || ''} onChange={(e) => field('subtitle', e.target.value)} /></div>
          <ImageUpload
            label="Image"
            aspect="aspect-[16/5]"
            value={draft.image_url}
            onChange={(url) => field('image_url', url || '')}
          />
          <div><label className="label">Link URL</label><input className="input" value={draft.link_url || ''} onChange={(e) => field('link_url', e.target.value)} placeholder="/collections/face" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Sort</label>
              <input className="input" type="number" value={draft.sort_order || 0} onChange={(e) => field('sort_order', Number(e.target.value))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={draft.is_active ? '1' : '0'} onChange={(e) => field('is_active', Number(e.target.value))}>
                <option value="1">Active</option>
                <option value="0">Off</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1">{editingId ? 'Save changes' : 'Add banner'}</button>
            {editingId && <button type="button" className="btn-ghost" onClick={() => { setDraft(empty); setEditingId(null); }}>Cancel</button>}
          </div>
        </form>

        <div className="lg:col-span-2 space-y-3">
          {busy && <div className="card p-5 text-ink-500">Loading…</div>}
          {!busy && rows.length === 0 && <div className="card p-5 text-ink-500">No banners yet.</div>}
          {rows.map((b) => (
            <div key={b.id} className="card overflow-hidden flex flex-col sm:flex-row">
              <img src={b.image_url} alt="" className="w-full sm:w-56 h-32 object-cover" />
              <div className="p-4 flex-1">
                <div className="flex items-center gap-2 text-xs text-ink-500">
                  <span className="badge bg-brand-50 text-brand-700">{b.placement}</span>
                  {b.is_active ? <span className="badge bg-green-100 text-green-700">Active</span> : <span className="badge bg-ink-100 text-ink-700">Off</span>}
                  <span>· sort {b.sort_order}</span>
                </div>
                <div className="font-medium mt-1">{b.title || <em className="text-ink-500">(no title)</em>}</div>
                <div className="text-sm text-ink-700">{b.subtitle}</div>
                <div className="text-xs text-ink-500 mt-1">{b.link_url}</div>
                <div className="mt-2 flex gap-3 text-sm">
                  <button onClick={() => edit(b)} className="text-brand-600 hover:underline">Edit</button>
                  <button onClick={() => remove(b.id)} className="text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
