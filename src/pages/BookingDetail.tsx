import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LeafletMap from '@/components/Map/LeafletMap';
import { getMyBookings } from '@/lib/availability';

export default function BookingDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const bookingId = id ? decodeURIComponent(id) : null;
  const items = getMyBookings() || [];
  const booking = useMemo(() => items.find((b: any) => b.id === bookingId), [items, bookingId]);

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Header />
        <main className="pt-16">
          <div className="container mx-auto px-4 lg:px-6 py-8">
            <Card>
              <CardContent className="p-6 text-center">Booking not found.</CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="pt-16">
        <div className="container mx-auto px-4 lg:px-6 py-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">Booking Details</h1>
            <div>
              <Button variant="outline" onClick={() => nav('/cart')}>Back to Bookings</Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Card>
                <CardHeader><CardTitle>Details</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="font-semibold">{booking.salonName || booking.storeName || 'Salon'}</div>
                  <div className="text-sm text-muted-foreground">{booking.date} {booking.time ? ' • ' + booking.time : ''}</div>
                  <div className="text-sm">{(booking.services && booking.services.join) ? booking.services.join(', ') : (booking.notes || '')}</div>
                  <div className="mt-2 text-sm text-muted-foreground">Booking ID: {booking.id}</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <Card>
                <CardHeader><CardTitle>Map</CardTitle></CardHeader>
                <CardContent>
                  <div className="h-64 w-full rounded overflow-hidden">
                    <LeafletMap
                      salon={{ name: booking.salonName || booking.storeName, address: booking.salonAddress || booking.storeAddress }}
                      userLocation={booking.userLat && booking.userLng ? { latitude: booking.userLat, longitude: booking.userLng } : null}
                      height={256}
                      showRoute={booking.location === 'home'}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
