import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { get, post, put, del } from '../lib/api';
import { minorToInputString, toMinor } from '../lib/money';
import ImageUpload from '../components/ImageUpload';
import VideoUpload from '../components/VideoUpload';

const emptyForm = {
  category_id: '', slug: '', sku: '', name: '', brand: '',
  short_desc: '', description: '',
  price_aed: '', sale_price_aed: '',
  currency: 'AED', stock: 0,
  is_active: 1, is_featured: 0, is_new: 0, is_bestseller: 0,
  position: 0,
  main_image_url: '',
};

export default function ProductEditPage() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const nav = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [variants, setVariants] = useState([]);
  const [volumeTiers, setVolumeTiers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const cats = await get('/admin/categories');
        setCategories(cats || []);
        if (isNew) {
          setForm(emptyForm);
          setBusy(false);
          return;
        }
        const p = await get(`/admin/products/${id}`);
        setForm({
          category_id:    p.category_id || '',
          slug:           p.slug || '',
          sku:            p.sku || '',
          name:           p.name || '',
          brand:          p.brand || '',
          short_desc:     p.short_desc || '',
          description:    p.description || '',
          price_aed:      minorToInputString(p.price_minor),
          sale_price_aed: minorToInputString(p.sale_price_minor),
          currency:       p.currency || 'AED',
          stock:          p.stock || 0,
          is_active:      Number(p.is_active)     === 1 ? 1 : 0,
          is_featured:    Number(p.is_featured)   === 1 ? 1 : 0,
          is_new:         Number(p.is_new)        === 1 ? 1 : 0,
          is_bestseller:  Number(p.is_bestseller) === 1 ? 1 : 0,
          position:       Number(p.position) || 0,
          main_image_url: p.main_image_url || '',
        });
        setImages(p.images || []);
        setVariants(p.variants || []);
        setVolumeTiers(p.volume_discounts || []);
      } catch (e) {
        setErr(e.message);
      } finally {
        setBusy(false);
      }
    })();
  }, [id, isNew]);

  function field(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const body = {
        category_id:      form.category_id ? Number(form.category_id) : null,
        slug:             form.slug,
        sku:              form.sku || null,
        name:             form.name,
        brand:            form.brand || null,
        short_desc:       form.short_desc || null,
        description:      form.description || null,
        price_minor:      toMinor(form.price_aed),
        sale_price_minor: form.sale_price_aed ? toMinor(form.sale_price_aed) : null,
        currency:         form.currency || 'AED',
        stock:            Number(form.stock) || 0,
        is_active:        form.is_active ? 1 : 0,
        is_featured:      form.is_featured ? 1 : 0,
        is_new:           form.is_new ? 1 : 0,
        is_bestseller:    form.is_bestseller ? 1 : 0,
        position:         Math.max(0, parseInt(form.position, 10) || 0),
        main_image_url:   form.main_image_url || null,
      };
      if (isNew) {
        const created = await post('/admin/products', body);
        nav(`/products/${created.id}`);
      } else {
        await put(`/admin/products/${id}`, body);
        nav('/products');
      }
    } catch (e) {
      setErr(e.message); setBusy(false);
    }
  }

  // Called when a gallery image finishes uploading — attaches it to the product.
  async function attachGalleryImage(url) {
    if (!url) return;
    if (isNew) {
      // Product hasn't been saved yet — set as main image and prompt user to save first.
      field('main_image_url', url);
      alert('Image uploaded and set as the main image. Save the product, then come back to add more gallery images.');
      return;
    }
    try {
      const r = await post(`/admin/products/${id}/images`, { url, media_type: 'image', sort_order: images.length });
      setImages((x) => [...x, r]);
    } catch (e) { alert(e.message); }
  }

  // Called when a gallery video finishes uploading. Receives { url, media_type }.
  async function attachGalleryVideo({ url, media_type }) {
    if (!url) return;
    if (isNew) {
      alert('Save the product first, then come back to add videos.');
      return;
    }
    try {
      const r = await post(`/admin/products/${id}/images`, { url, media_type, sort_order: images.length });
      setImages((x) => [...x, r]);
    } catch (e) { alert(e.message); }
  }

  async function removeImage(imgId) {
    if (!window.confirm('Remove this media?')) return;
    try {
      await del(`/admin/products/${id}/images/${imgId}`);
      setImages((x) => x.filter((i) => i.id !== imgId));
    } catch (e) { alert(e.message); }
  }

  /** Move a gallery image left/right by swapping sort_order on the server. */
  async function moveImage(imgId, direction) {
    const idx = images.findIndex((i) => i.id === imgId);
    if (idx === -1) return;
    const swapIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= images.length) return;
    const a = images[idx], b = images[swapIdx];
    // optimistic UI swap
    const next = images.slice();
    next[idx] = b; next[swapIdx] = a;
    setImages(next.map((im, i) => ({ ...im, sort_order: i })));
    try {
      await put(`/admin/products/${id}/images/${a.id}`, { sort_order: swapIdx });
      await put(`/admin/products/${id}/images/${b.id}`, { sort_order: idx });
    } catch (e) {
      // revert
      setImages(images);
      alert(e.message);
    }
  }

  // ---- Variant (shade) handlers ----
  async function addVariant() {
    if (isNew) { alert('Save the product first, then add shades.'); return; }
    const shade = window.prompt('Shade / colour name (e.g. "05 Beige")');
    if (!shade) return;
    try {
      const v = await post(`/admin/products/${id}/variants`, {
        shade, title: shade,
        price_minor: toMinor(form.price_aed) || Number(form.price_aed) * 100 || 0,
        sort_order: variants.length,
        is_available: 1,
      });
      setVariants((x) => [...x, v]);
    } catch (e) { alert(e.message); }
  }

  async function patchVariant(variantId, patch) {
    try {
      const v = await put(`/admin/products/${id}/variants/${variantId}`, patch);
      setVariants((x) => x.map((row) => (row.id === variantId ? v : row)));
    } catch (e) { alert(e.message); }
  }

  async function removeVariant(variantId) {
    if (!window.confirm('Remove this shade?')) return;
    try {
      await del(`/admin/products/${id}/variants/${variantId}`);
      setVariants((x) => x.filter((row) => row.id !== variantId));
    } catch (e) { alert(e.message); }
  }

  // ---- Volume discount tier handlers ----
  async function addVolumeTier() {
    if (isNew) { alert('Save the product first, then add bulk-quantity discounts.'); return; }
    const qtyStr = window.prompt('Minimum quantity to qualify (e.g. 5)');
    const qty = parseInt(qtyStr, 10);
    if (!qty || qty < 2) { if (qtyStr !== null) alert('Minimum qty must be 2 or more.'); return; }
    const discStr = window.prompt(`Discount in AED when customer buys ${qty}+ units (e.g. 5)`);
    const disc = parseFloat(discStr);
    if (!disc || disc <= 0) { if (discStr !== null) alert('Discount must be greater than zero.'); return; }
    try {
      const t = await post(`/admin/products/${id}/volume-discounts`, {
        min_qty: qty,
        discount_minor: Math.round(disc * 100),
        sort_order: volumeTiers.length,
      });
      setVolumeTiers((x) => [...x, t].sort((a, b) => a.min_qty - b.min_qty));
    } catch (e) { alert(e.message); }
  }

  async function patchVolumeTier(tierId, patch) {
    try {
      const t = await put(`/admin/products/${id}/volume-discounts/${tierId}`, patch);
      setVolumeTiers((x) => x.map((r) => (r.id === tierId ? t : r)).sort((a, b) => a.min_qty - b.min_qty));
    } catch (e) { alert(e.message); }
  }

  async function removeVolumeTier(tierId) {
    if (!window.confirm('Remove this discount tier?')) return;
    try {
      await del(`/admin/products/${id}/volume-discounts/${tierId}`);
      setVolumeTiers((x) => x.filter((r) => r.id !== tierId));
    } catch (e) { alert(e.message); }
  }

  async function reorderVariant(variantId, direction) {
    const idx = variants.findIndex((v) => v.id === variantId);
    if (idx === -1) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= variants.length) return;
    const a = variants[idx], b = variants[swapIdx];
    const next = variants.slice();
    next[idx] = b; next[swapIdx] = a;
    setVariants(next.map((v, i) => ({ ...v, sort_order: i })));
    try {
      await put(`/admin/products/${id}/variants/${a.id}`, { sort_order: swapIdx });
      await put(`/admin/products/${id}/variants/${b.id}`, { sort_order: idx });
    } catch (e) { setVariants(variants); alert(e.message); }
  }

  /** Promote a gallery image to be the main image (and demote current main to gallery). */
  async function setAsMain(img) {
    const oldMain = form.main_image_url;
    field('main_image_url', img.url);
    if (oldMain && oldMain !== img.url) {
      try {
        await post(`/admin/products/${id}/images`, { url: oldMain, sort_order: images.length });
      } catch {}
    }
    try {
      await del(`/admin/products/${id}/images/${img.id}`);
      setImages((x) => x.filter((i) => i.id !== img.id));
      // Save the new main_image_url right away
      await put(`/admin/products/${id}`, {
        category_id:      form.category_id ? Number(form.category_id) : null,
        slug:             form.slug,
        sku:              form.sku || null,
        name:             form.name,
        brand:            form.brand || null,
        short_desc:       form.short_desc || null,
        description:      form.description || null,
        price_minor:      toMinor(form.price_aed),
        sale_price_minor: form.sale_price_aed ? toMinor(form.sale_price_aed) : null,
        currency:         form.currency || 'AED',
        stock:            Number(form.stock) || 0,
        is_active:        form.is_active ? 1 : 0,
        is_featured:      form.is_featured ? 1 : 0,
        is_new:           form.is_new ? 1 : 0,
        is_bestseller:    form.is_bestseller ? 1 : 0,
        main_image_url:   img.url,
      });
    } catch (e) { alert(e.message); }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isNew ? 'New product' : 'Edit product'}</h1>
        <Link to="/products" className="text-sm text-ink-500 hover:underline">← Back</Link>
      </div>

      {err && <div className="mt-4 rounded-md bg-red-50 text-red-700 px-3 py-2 text-sm">{err}</div>}

      <form onSubmit={save} className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5 space-y-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={form.name} onChange={(e) => field('name', e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Slug</label>
                <input className="input" value={form.slug} onChange={(e) => field('slug', e.target.value)} placeholder="auto" />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={form.sku} onChange={(e) => field('sku', e.target.value)} />
              </div>
            </div>
            <div>
              <label className="label">Brand</label>
              <input className="input" value={form.brand} onChange={(e) => field('brand', e.target.value)} />
            </div>
            <div>
              <label className="label">Short product description</label>
              <input className="input" value={form.short_desc} onChange={(e) => field('short_desc', e.target.value)} maxLength={500} placeholder="One sentence — shown on listings &amp; cart" />
              <p className="text-xs text-ink-500 mt-1">{form.short_desc?.length || 0} / 500 characters</p>
            </div>
            <div>
              <label className="label">Detailed product information</label>
              <textarea className="input min-h-[140px]" value={form.description} onChange={(e) => field('description', e.target.value)} placeholder="Full details shown on the product page" />
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold">Pricing &amp; stock</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="label">Regular price (AED)</label>
                <input className="input" value={form.price_aed} onChange={(e) => field('price_aed', e.target.value)} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Offer / discount price (AED)</label>
                <input className="input" value={form.sale_price_aed} onChange={(e) => field('sale_price_aed', e.target.value)} placeholder="leave blank if no offer" />
              </div>
              <div>
                <label className="label">Stock</label>
                <input className="input" type="number" value={form.stock} onChange={(e) => field('stock', e.target.value)} />
              </div>
            </div>
            <DiscountPreview regular={form.price_aed} sale={form.sale_price_aed} />
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold">Images &amp; videos</h2>

            <ImageUpload
              label="Main image"
              value={form.main_image_url}
              onChange={(url) => field('main_image_url', url || '')}
            />

            {!isNew && (
              <div>
                <label className="label">Gallery (additional photos &amp; videos)</label>
                <div className="flex flex-wrap gap-3 mb-3">
                  {images.map((img, i) => {
                    const isVideo = (img.media_type === 'video');
                    return (
                      <div key={img.id} className="relative">
                        {isVideo ? (
                          <div className="w-24 h-24 rounded border border-ink-300 bg-black overflow-hidden relative">
                            <video src={img.url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                            <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <span className="bg-black/60 text-white rounded-full w-7 h-7 flex items-center justify-center text-base">▶</span>
                            </span>
                          </div>
                        ) : (
                          <img src={img.url} alt="" className="w-24 h-24 object-cover rounded border border-ink-300" />
                        )}
                        {/* sort_order badge + type pill */}
                        <span className="absolute top-1 left-1 bg-black/70 text-white text-[10px] font-bold rounded px-1.5 py-0.5">#{i + 1}</span>
                        {isVideo && (
                          <span className="absolute top-1 right-1 bg-red-600 text-white text-[9px] font-bold uppercase rounded px-1.5 py-0.5">Video</span>
                        )}
                        {/* reorder + main + remove */}
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 bg-white border border-ink-300 rounded shadow px-1 py-0.5">
                          <button type="button" disabled={i === 0} onClick={() => moveImage(img.id, 'left')} className="text-xs px-1 disabled:opacity-30" title="Move left">◀</button>
                          {!isVideo && (
                            <button type="button" onClick={() => setAsMain(img)} className="text-xs px-1 text-brand-700" title="Set as main image">★</button>
                          )}
                          <button type="button" disabled={i === images.length - 1} onClick={() => moveImage(img.id, 'right')} className="text-xs px-1 disabled:opacity-30" title="Move right">▶</button>
                        </div>
                        <button type="button" onClick={() => removeImage(img.id)} className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" title="Delete">×</button>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-end gap-3 flex-wrap">
                  <ImageUpload
                    key={'img-' + images.length /* reset to empty state after each upload */}
                    label={null}
                    value={null}
                    onChange={attachGalleryImage}
                  />
                  <VideoUpload
                    key={'vid-' + images.length}
                    onChange={attachGalleryVideo}
                  />
                </div>
                <p className="text-xs text-ink-500 mt-2">
                  ◀ ▶ reorder · ★ promote to main image (photos only) · × delete. Videos play with a ▶ badge on the storefront thumbnail strip.
                </p>
              </div>
            )}
          </div>

          {/* Shade variants — each shade has its own photo */}
          {!isNew && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Shades / Variants</h2>
                  <p className="text-xs text-ink-500">Each shade has its own photo, price, and stock toggle. Edits save when you click out of a field.</p>
                </div>
                <button type="button" onClick={addVariant} className="btn-ghost text-sm whitespace-nowrap">+ Add shade</button>
              </div>

              {!variants.length ? (
                <p className="text-sm text-ink-500 italic">No shades yet. Click "+ Add shade" to create the first one.</p>
              ) : (
                <ul className="space-y-4">
                  {variants.map((v, i) => (
                    <li key={v.id} className="border border-ink-200 rounded-lg bg-ink-100/30 overflow-hidden">
                      {/* Top bar — shade order badge + status pill + reorder/delete actions */}
                      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-ink-100">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold">{i + 1}</span>
                          <span className="font-medium text-ink-900">{v.shade || v.title || '(no name)'}</span>
                          {v.is_available
                            ? <span className="badge bg-green-100 text-green-700">In stock</span>
                            : <span className="badge bg-red-100 text-red-700">Out of stock</span>}
                        </div>
                        <div className="flex items-center gap-1">
                          <button type="button" disabled={i === 0}                onClick={() => reorderVariant(v.id, 'up')}   className="text-sm w-7 h-7 rounded hover:bg-ink-100 disabled:opacity-30" title="Move up">▲</button>
                          <button type="button" disabled={i === variants.length - 1} onClick={() => reorderVariant(v.id, 'down')} className="text-sm w-7 h-7 rounded hover:bg-ink-100 disabled:opacity-30" title="Move down">▼</button>
                          <button type="button" onClick={() => removeVariant(v.id)} className="text-xs text-red-600 hover:bg-red-50 px-2 h-7 rounded ml-2">Delete</button>
                        </div>
                      </div>

                      {/* Body — photo on top (its own row), fields below. Stacked so nothing collides. */}
                      <div className="p-4 space-y-4">
                        <div>
                          <label className="label">Shade photo</label>
                          <ImageUpload
                            label={null}
                            value={v.image_url}
                            onChange={(url) => patchVariant(v.id, { image_url: url })}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="label">Shade name</label>
                            <input
                              className="input"
                              defaultValue={v.shade ?? v.title ?? ''}
                              onBlur={(e) => {
                                const val = e.target.value.trim();
                                if (val && val !== (v.shade ?? '')) patchVariant(v.id, { shade: val, title: val });
                              }}
                            />
                          </div>
                          <div>
                            <label className="label">SKU (optional)</label>
                            <input
                              className="input"
                              defaultValue={v.sku ?? ''}
                              onBlur={(e) => { if (e.target.value !== (v.sku ?? '')) patchVariant(v.id, { sku: e.target.value }); }}
                            />
                          </div>
                          <div>
                            <label className="label">Regular price (AED)</label>
                            <input
                              className="input"
                              type="number" step="0.01" min="0"
                              defaultValue={((v.price_minor ?? 0) / 100).toFixed(2)}
                              onBlur={(e) => {
                                const n = Math.round((parseFloat(e.target.value) || 0) * 100);
                                if (n !== Number(v.price_minor)) patchVariant(v.id, { price_minor: n });
                              }}
                            />
                          </div>
                          <div>
                            <label className="label">Offer price (AED, blank if none)</label>
                            <input
                              className="input"
                              type="number" step="0.01" min="0"
                              defaultValue={v.sale_price_minor != null ? (v.sale_price_minor / 100).toFixed(2) : ''}
                              onBlur={(e) => {
                                const n = e.target.value === '' ? null : Math.round(parseFloat(e.target.value) * 100);
                                if (n !== v.sale_price_minor) patchVariant(v.id, { sale_price_minor: n });
                              }}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="label">Stock for this shade (units)</label>
                            <input
                              className="input"
                              type="number" min="0" step="1"
                              defaultValue={v.stock ?? 0}
                              onBlur={(e) => {
                                const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                                if (n !== Number(v.stock ?? 0)) patchVariant(v.id, { stock: n });
                              }}
                            />
                            <p className="text-xs text-ink-500 mt-1">
                              Set to <strong>0</strong> to use the product's main "Stock" field above instead
                              (no separate tracking for this shade). Set to any number to track this shade
                              independently — customers can't buy more than the entered amount.
                            </p>
                          </div>
                        </div>

                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={!!v.is_available}
                            onChange={(e) => patchVariant(v.id, { is_available: e.target.checked ? 1 : 0 })}
                            className="rounded border-ink-300 text-brand-600 focus:ring-brand-500"
                          />
                          <span>This shade is available to buy</span>
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* ===== Bulk-quantity discounts (volume tiers) ===== */}
          {!isNew && (
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold">Bulk-quantity discount</h2>
                  <p className="text-xs text-ink-500">
                    Reward customers who buy more of this product. Example: buy 5 → save AED 5; buy 10 → save AED 10.
                    The highest matching tier is applied to the line at checkout.
                  </p>
                </div>
                <button type="button" onClick={addVolumeTier} className="btn-ghost text-sm whitespace-nowrap">+ Add tier</button>
              </div>

              {!volumeTiers.length ? (
                <p className="text-sm text-ink-500 italic">No tiers yet. Click "+ Add tier" to create the first one.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-ink-500 border-b border-ink-200">
                      <th className="py-2 font-medium">Min quantity</th>
                      <th className="py-2 font-medium">Discount (AED off the line)</th>
                      <th className="py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {volumeTiers.map((t) => (
                      <tr key={t.id} className="border-b border-ink-100">
                        <td className="py-2 pr-3">
                          <input
                            className="input w-28"
                            type="number" min="2" step="1"
                            defaultValue={t.min_qty}
                            onBlur={(e) => {
                              const n = Math.max(2, parseInt(e.target.value, 10) || 2);
                              if (n !== Number(t.min_qty)) patchVolumeTier(t.id, { min_qty: n });
                            }}
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            className="input w-32"
                            type="number" min="0" step="0.01"
                            defaultValue={((t.discount_minor ?? 0) / 100).toFixed(2)}
                            onBlur={(e) => {
                              const n = Math.max(0, Math.round((parseFloat(e.target.value) || 0) * 100));
                              if (n !== Number(t.discount_minor)) patchVolumeTier(t.id, { discount_minor: n });
                            }}
                          />
                        </td>
                        <td className="py-2 text-right">
                          <button type="button" onClick={() => removeVolumeTier(t.id)} className="text-xs text-red-600 hover:bg-red-50 px-2 py-1 rounded">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold">Status</h2>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category_id} onChange={(e) => field('category_id', e.target.value)}>
                <option value="">— None —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Visibility</label>
              <select className="input" value={form.is_active ? '1' : '0'} onChange={(e) => field('is_active', Number(e.target.value))}>
                <option value="1">Active (live on storefront)</option>
                <option value="0">Hidden</option>
              </select>
            </div>
            <div>
              <label className="label">Position in category</label>
              <input
                className="input"
                type="number" min="0" step="1"
                value={form.position}
                onChange={(e) => field('position', e.target.value)}
                placeholder="0 = no priority (newest first)"
              />
              <p className="text-xs text-ink-500 mt-1">
                Lower number = appears first on the storefront category page.
                1 shows first, 2 next, etc. Leave at <strong>0</strong> to let it sort by
                newest-first as usual.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <FlagToggle label="Featured" v={form.is_featured} onChange={(v) => field('is_featured', v)} />
              <FlagToggle label="New arrival" v={form.is_new} onChange={(v) => field('is_new', v)} />
              <FlagToggle label="Bestseller" v={form.is_bestseller} onChange={(v) => field('is_bestseller', v)} />
            </div>
          </div>
          <div className="flex gap-3">
            <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
            <Link to="/products" className="btn-ghost">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Shows the discount % whenever a valid sale price < regular price is entered. */
function DiscountPreview({ regular, sale }) {
  const r = parseFloat(String(regular).replace(/,/g, '')) || 0;
  const s = parseFloat(String(sale).replace(/,/g, '')) || 0;
  if (r <= 0 || s <= 0 || s >= r) return null;
  const pct = Math.round(((r - s) / r) * 100);
  return (
    <div className="text-sm rounded-md bg-brand-50 text-brand-700 px-3 py-2 inline-flex items-center gap-2">
      <span className="font-semibold">{pct}% off</span>
      <span className="text-xs opacity-75">Customer saves AED {(r - s).toFixed(2)}</span>
    </div>
  );
}

function FlagToggle({ label, v, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={!!v} onChange={(e) => onChange(e.target.checked ? 1 : 0)} className="rounded border-ink-300 text-brand-600 focus:ring-brand-500" />
      <span>{label}</span>
    </label>
  );
}
