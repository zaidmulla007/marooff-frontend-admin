import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { get, post, put } from '../lib/api';
import ImageUpload from '../components/ImageUpload';

const empty = { slug: '', name: '', description: '', image_url: '', sort_order: 0, is_active: 1 };

export default function CategoryEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const [data, setData] = useState(empty);
  const [busy, setBusy] = useState(!isNew);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (isNew) return;
    (async () => {
      try { setData(await get(`/admin/categories/${id}`)); }
      catch (e) { setErr(e.message); }
      finally { setBusy(false); }
    })();
  }, [id, isNew]);

  function field(k, v) { setData((d) => ({ ...d, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (isNew) await post('/admin/categories', data);
      else       await put(`/admin/categories/${id}`, data);
      nav('/categories');
    } catch (e) {
      setErr(e.message); setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New category' : 'Edit category'}</h1>
        <Link to="/categories" className="text-sm text-ink-500 hover:underline">← Back</Link>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={save} className="card mt-4 p-5 space-y-4">
        <div>
          <label className="label">Name</label>
          <input className="input" value={data.name || ''} onChange={(e) => field('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" value={data.slug || ''} onChange={(e) => field('slug', e.target.value)} placeholder="auto-generated if empty" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-[100px]" value={data.description || ''} onChange={(e) => field('description', e.target.value)} />
        </div>
        <ImageUpload label="Image" value={data.image_url} onChange={(url) => field('image_url', url || '')} />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Sort order</label>
            <input className="input" type="number" value={data.sort_order || 0} onChange={(e) => field('sort_order', Number(e.target.value))} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={data.is_active ? '1' : '0'} onChange={(e) => field('is_active', Number(e.target.value))}>
              <option value="1">Active</option>
              <option value="0">Hidden</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <Link to="/categories" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
