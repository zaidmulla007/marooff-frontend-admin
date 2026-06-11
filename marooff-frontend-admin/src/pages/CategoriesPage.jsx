import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, del } from '../lib/api';

export default function CategoriesPage() {
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  async function load() {
    setBusy(true);
    try { setRows(await get('/admin/categories') || []); }
    catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function remove(id) {
    if (!window.confirm('Delete this category?')) return;
    try { await del(`/admin/categories/${id}`); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Link to="/categories/new" className="btn-primary">+ New category</Link>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="card mt-4 overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Slug</th>
              <th>Sort</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {busy && <tr><td colSpan={6} className="text-center text-ink-500 py-6">Loading…</td></tr>}
            {!busy && rows.length === 0 && <tr><td colSpan={6} className="text-center text-ink-500 py-6">No categories yet.</td></tr>}
            {rows.map((c) => (
              <tr key={c.id}>
                <td><div className="w-10 h-10 rounded bg-ink-100 overflow-hidden">{c.image_url && <img src={c.image_url} className="w-full h-full object-cover" alt="" />}</div></td>
                <td className="font-medium">{c.name}</td>
                <td className="text-ink-500 text-xs">{c.slug}</td>
                <td>{c.sort_order}</td>
                <td>{c.is_active ? <span className="badge bg-green-100 text-green-700">Active</span> : <span className="badge bg-ink-100 text-ink-700">Off</span>}</td>
                <td className="text-right">
                  <Link to={`/categories/${c.id}`} className="text-brand-600 hover:underline text-sm mr-3">Edit</Link>
                  <button onClick={() => remove(c.id)} className="text-red-600 hover:underline text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
