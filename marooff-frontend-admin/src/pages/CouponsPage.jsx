import { useEffect, useState } from 'react';
import { api, get, post, put as apiPut, del as apiDel } from '../lib/api';
import { fromMinor } from '../lib/money';

const emptyForm = {
  code: '', type: 'percent', value_minor: 10,
  min_order_minor: 0, max_uses: '', is_active: 1,
  starts_at: '', ends_at: '', notes: '',
};

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [editing, setEditing] = useState(null);   // null = add-new mode, otherwise the row being edited
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { load(); }, []);
  async function load() {
    try { setCoupons(await get('/admin/coupons') || []); }
    catch (e) { setErr(e.message); }
  }
  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function startNew() { setEditing(null); setForm(emptyForm); setErr(''); }
  function startEdit(row) {
    setEditing(row);
    setForm({
      code: row.code, type: row.type,
      value_minor: row.value_minor,
      min_order_minor: row.min_order_minor,
      max_uses: row.max_uses ?? '',
      is_active: row.is_active ? 1 : 0,
      starts_at: row.starts_at ?? '',
      ends_at: row.ends_at ?? '',
      notes: row.notes ?? '',
    });
    setErr('');
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const body = {
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value_minor: Number(form.value_minor) || 0,
        min_order_minor: Number(form.min_order_minor) || 0,
        max_uses: form.max_uses === '' ? null : Number(form.max_uses),
        is_active: form.is_active ? 1 : 0,
        starts_at: form.starts_at || null,
        ends_at:   form.ends_at   || null,
        notes:     form.notes     || null,
      };
      if (editing) {
        await apiPut(`/admin/coupons/${editing.id}`, body);
      } else {
        await post('/admin/coupons', body);
      }
      startNew();
      load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function remove(row) {
    if (!window.confirm(`Delete coupon ${row.code}? Past orders that used it stay attributed.`)) return;
    try { await apiDel(`/admin/coupons/${row.id}`); load(); }
    catch (e) { alert(e.message); }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-ink-900">Coupons</h1>
      <p className="text-sm text-ink-500 mt-1">Create discount codes customers can apply at checkout.</p>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add / Edit form */}
        <form onSubmit={save} className="card p-5 space-y-3 lg:col-span-1 h-fit">
          <h2 className="font-semibold">{editing ? `Edit ${editing.code}` : 'New coupon'}</h2>
          <div>
            <label className="label">Code</label>
            <input className="input font-mono uppercase" value={form.code} onChange={(e) => field('code', e.target.value.toUpperCase())} placeholder="MAROOFF20" required />
            <p className="text-xs text-ink-500 mt-1">Customers type this code at checkout. Letters/numbers only.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={(e) => field('type', e.target.value)}>
                <option value="percent">Percent off (%)</option>
                <option value="fixed">Fixed amount (AED)</option>
              </select>
            </div>
            <div>
              <label className="label">{form.type === 'percent' ? 'Percent (1-100)' : 'Amount (fils)'}</label>
              <input className="input" type="number" value={form.value_minor} onChange={(e) => field('value_minor', e.target.value)} min={1} />
              <p className="text-xs text-ink-500 mt-1">
                {form.type === 'percent'
                  ? `${form.value_minor || 0}% off the cart subtotal`
                  : `AED ${((Number(form.value_minor) || 0)/100).toFixed(2)} off`}
              </p>
            </div>
          </div>
          <div>
            <label className="label">Min order (fils)</label>
            <input className="input" type="number" value={form.min_order_minor} onChange={(e) => field('min_order_minor', e.target.value)} min={0} />
            <p className="text-xs text-ink-500 mt-1">0 = no minimum. Otherwise: AED {((Number(form.min_order_minor)||0)/100).toFixed(2)} min subtotal.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Max uses</label>
              <input className="input" type="number" value={form.max_uses} onChange={(e) => field('max_uses', e.target.value)} placeholder="unlimited" />
            </div>
            <label className="flex items-center gap-2 mt-7">
              <input type="checkbox" checked={!!form.is_active} onChange={(e) => field('is_active', e.target.checked ? 1 : 0)} className="rounded" />
              <span className="text-sm">Active</span>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Starts (optional)</label>
              <input className="input" type="datetime-local" value={form.starts_at} onChange={(e) => field('starts_at', e.target.value)} />
            </div>
            <div>
              <label className="label">Ends (optional)</label>
              <input className="input" type="datetime-local" value={form.ends_at} onChange={(e) => field('ends_at', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Internal notes</label>
            <input className="input" value={form.notes} onChange={(e) => field('notes', e.target.value)} placeholder="Only visible to admin" />
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : (editing ? 'Save changes' : 'Create coupon')}</button>
            {editing && <button type="button" onClick={startNew} className="btn-ghost">Cancel</button>}
          </div>
        </form>

        {/* List */}
        <div className="lg:col-span-2 space-y-3">
          {!coupons.length && <div className="card p-8 text-center text-ink-500">No coupons yet. Create your first one on the left.</div>}
          {coupons.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-brand-700">{c.code}</span>
                    {!c.is_active && <span className="badge bg-gray-100 text-gray-600">inactive</span>}
                    {c.is_active && <span className="badge bg-green-100 text-green-700">active</span>}
                  </div>
                  <div className="text-sm text-ink-700 mt-1">
                    {c.type === 'percent' ? `${c.value_minor}% off` : `${fromMinor(c.value_minor)} off`}
                    {c.min_order_minor > 0 && <> · min order {fromMinor(c.min_order_minor)}</>}
                    {c.max_uses != null && <> · {c.uses_count}/{c.max_uses} used</>}
                    {c.max_uses == null && c.uses_count > 0 && <> · {c.uses_count} uses</>}
                  </div>
                  {(c.starts_at || c.ends_at) && (
                    <div className="text-xs text-ink-500 mt-1">
                      {c.starts_at && <>from {c.starts_at} </>}
                      {c.ends_at && <>until {c.ends_at}</>}
                    </div>
                  )}
                  {c.notes && <div className="text-xs text-ink-500 mt-1 italic">{c.notes}</div>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => startEdit(c)} className="text-sm text-brand-600 hover:underline">Edit</button>
                  <button onClick={() => remove(c)} className="text-sm text-red-600 hover:underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
