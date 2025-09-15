import React from 'react';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getMyBookings } from '@/lib/availability';
import { Link } from 'react-router-dom';

export default function Cart() {
  const items = (getMyBookings() || []).slice();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <h1 className="text-2xl font-bold mb-4">My Bookings</h1>
          {items.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">No bookings found in your cart.</CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {items.map((b: any) => (
                <Card key={b.id}>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{b.salonName || b.storeName || 'Untitled Salon'}</div>
                      <div className="text-sm text-muted-foreground">{b.date} {b.time ? ' • ' + b.time : ''}</div>
                      <div className="text-sm text-muted-foreground">{(b.services && b.services.join) ? b.services.join(', ') : (b.notes || '')}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link to={`/booking/${encodeURIComponent(b.id)}`}>
                        <Button className="">View</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
