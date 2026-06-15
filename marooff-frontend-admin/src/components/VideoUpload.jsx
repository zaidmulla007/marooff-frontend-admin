import { useRef, useState } from 'react';
import { api } from '../lib/api';

/**
 * File-picker for product videos. Hits the same /admin/media/upload endpoint
 * as ImageUpload — the backend accepts both images and videos and tells us
 * which it was. On success, calls `onChange({ url, media_type })`.
 *
 * Props:
 *   onChange({ url, media_type })  fires when a video uploads successfully
 *   maxSizeMb                       optional cap (default 50 MB; backend also enforces)
 */
export default function VideoUpload({ onChange, maxSizeMb = 50 }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState('');

  async function pick(e) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setErr('');
    if (f.size > maxSizeMb * 1024 * 1024) {
      setErr(`Video too large (${(f.size / 1024 / 1024).toFixed(1)} MB, max ${maxSizeMb} MB).`);
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const r = await api.post('/admin/media/upload', fd);
      const payload = r.payload || {};
      if (payload.media_type !== 'video') {
        setErr('That file is an image, not a video. Use the "Add image" button instead.');
        return;
      }
      onChange({ url: payload.url, media_type: 'video' });
    } catch (e) {
      setErr(e.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/ogg,video/quicktime" onChange={pick} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="aspect-square w-24 rounded-md border-2 border-dashed border-ink-300 bg-ink-100 hover:border-brand-500 hover:bg-brand-50 flex flex-col items-center justify-center text-ink-500 text-xs transition"
        title="Upload a product video (MP4/WEBM/MOV)"
      >
        {busy ? (
          <span className="text-[10px]">Uploading…</span>
        ) : (
          <>
            <span className="text-xl leading-none mb-0.5">🎥</span>
            <span className="text-[10px] font-medium text-center px-1">Add video</span>
            <span className="text-[9px] mt-0.5 text-ink-500">MP4 max {maxSizeMb}MB</span>
          </>
        )}
      </button>
      {err && <div className="mt-2 rounded-md bg-red-50 text-red-700 px-2 py-1 text-xs max-w-[240px]">{err}</div>}
    </div>
  );
}
