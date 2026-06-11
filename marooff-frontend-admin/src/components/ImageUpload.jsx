import { useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * File-picker image uploader.
 *
 * Props:
 *   value          string | null  — current image URL (or null)
 *   onChange(url)  callback fired with the uploaded image URL (or null on clear)
 *   label          optional label
 *   aspect         optional CSS aspect class, e.g. "aspect-square" (default), "aspect-video", "aspect-[16/5]"
 *   accept         optional MIME list (default image/*)
 *   maxSizeMb      optional file-size guard (default 10MB)
 */
export default function ImageUpload({
  value,
  onChange,
  label = 'Image',
  aspect = 'aspect-square',
  accept = 'image/*',
  maxSizeMb = 10,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file
    if (!f) return;
    setErr('');
    if (f.size > maxSizeMb * 1024 * 1024) {
      setErr(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB, max ${maxSizeMb} MB)`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await api.post('/admin/media/upload', fd);
      onChange(r.payload.url);
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  function clearImage() {
    onChange(null);
  }

  return (
    <div>
      {label && <label className="label">{label}</label>}
      <input ref={fileRef} type="file" accept={accept} onChange={pick} className="hidden" />

      {value ? (
        <div className="flex items-start gap-3">
          <div className={`${aspect} w-40 rounded-md border border-ink-300 overflow-hidden bg-ink-100 shrink-0`}>
            <img src={value} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex flex-col gap-2">
            <button type="button" className="btn-ghost text-xs" onClick={() => fileRef.current?.click()} disabled={busy}>
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button type="button" className="text-red-600 hover:underline text-xs text-left" onClick={clearImage}>Remove</button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className={`${aspect} w-40 rounded-md border-2 border-dashed border-ink-300 bg-ink-100 hover:border-brand-500 hover:bg-brand-50 flex flex-col items-center justify-center text-ink-500 text-sm transition`}
        >
          {busy ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span className="text-2xl leading-none mb-1">＋</span>
              <span>Choose file</span>
              <span className="text-[10px] mt-1 text-ink-500">PNG/JPG/WEBP, max {maxSizeMb} MB</span>
            </>
          )}
        </button>
      )}

      {err && <div className="mt-2 rounded-md bg-red-50 text-red-700 px-2 py-1 text-xs">{err}</div>}
    </div>
  );
}
