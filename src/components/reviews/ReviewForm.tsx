import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';

export default function ReviewForm({ storeId, onPosted }: { storeId: string | number, onPosted?: (r:any)=>void }) {
  const [rating, setRating] = useState<number>(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      const res = await apiFetch('/reviews', { method: 'POST', body: JSON.stringify({ storeId: String(storeId), rating, title, body }) });
      const j = await res.json();
      toast.success && toast.success('Review posted');
      setTitle(''); setBody(''); setRating(5);
      if (onPosted) onPosted(j.review);
    } catch (e:any) {
      toast.error && toast.error('Failed to post review: ' + (e?.message || String(e)));
    } finally { setLoading(false); }
  }

  return (
    <div className="p-3 border rounded">
      <div className="mb-2 text-sm font-medium">Write a review</div>
      <div className="flex items-center gap-2 mb-2">
        <label className="text-sm">Rating</label>
        <select value={String(rating)} onChange={(e)=>setRating(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
          {[5,4,3,2,1].map(n=> <option key={n} value={n}>{n} stars</option>)}
        </select>
      </div>
      <div className="mb-2">
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" />
      </div>
      <div className="mb-3">
        <textarea placeholder="Share your experience" value={body} onChange={e=>setBody(e.target.value)} className="w-full border rounded px-2 py-1 text-sm" rows={3} />
      </div>
      <div className="flex justify-end">
        <Button onClick={submit} disabled={loading || !rating} size="sm">Post review</Button>
      </div>
    </div>
  );
}
