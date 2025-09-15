import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api';

export default function ReviewList({ storeId }: { storeId: string | number }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch(`/reviews?storeId=${storeId}`);
        const j = await res.json();
        if (mounted) {
          setReviews(j.reviews || []);
          setAvg(j.average || 0);
        }
      } catch (e) { console.error(e); }
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [storeId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm">Average rating: <span className="font-semibold">{avg ? avg.toFixed(1) : 'N/A'}</span></div>
        <div className="text-sm text-muted-foreground">{reviews.length} reviews</div>
      </div>
      {loading ? <div className="text-sm text-muted-foreground">Loading reviews...</div> : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="p-3 border rounded">
              <div className="flex items-center gap-2 text-yellow-500">{'★'.repeat(Math.max(0, Math.min(5, Math.round(r.rating))))} <span className="text-foreground font-medium">{r.title || ''}</span></div>
              <div className="text-sm text-muted-foreground">{r.body}</div>
              <div className="text-xs text-muted-foreground mt-2">{r.userId ? 'By ' + r.userId : 'Anonymous'} • {new Date(r.createdAt || r.createdAt || Date.now()).toLocaleString()}</div>
            </div>
          ))}
          {reviews.length === 0 && <div className="text-sm text-muted-foreground">No reviews yet. Be the first to review!</div>}
        </div>
      )}
    </div>
  );
}
