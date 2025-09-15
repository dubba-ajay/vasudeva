import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, X, Check, Home, Building } from "lucide-react";

interface Service {
  id: number;
  name: string;
  price: string;
  duration: string;
  homeVisit: boolean;
  salonVisit: boolean;
}

interface Salon {
  id: number;
  name: string;
  rating: number;
  distance: string;
  address: string;
  image: string;
}

interface BookingModalProps {
  service: Service | null;
  services: Service[];
  salon: Salon;
  isOpen: boolean;
  onClose: () => void;
}

const timeSlots = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM"
];

// Mock availability data
const getAvailability = (date: Date) => {
  const availableSlots = timeSlots.filter(() => Math.random() > 0.3);
  return availableSlots;
};

import { listBookedSlots, bookSlot } from "@/lib/availability";

import { useNavigate } from 'react-router-dom';
import { useMarketplaceSafe } from '@/contexts/MarketplaceContext';

const BookingModal = ({ service, services, salon, isOpen, onClose }: BookingModalProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string>();
  const [selectedLocation, setSelectedLocation] = useState<"salon" | "home">("salon");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(service?.id ? [service.id] : []);
  const dateKey = useMemo(() => (selectedDate ? selectedDate.toISOString().slice(0, 10) : undefined), [selectedDate]);

  useEffect(() => {
    setSelectedServiceIds(service?.id ? [service.id] : []);
  }, [service?.id]);

  const selectedServices = useMemo(() => services.filter(s => selectedServiceIds.includes(s.id)), [services, selectedServiceIds]);

  const marketplaceCtx = useMarketplaceSafe();
  // fallback stub if marketplace provider is not mounted yet
  const marketplace = marketplaceCtx ?? {
    isHomeServiceAvailable: () => false,
    getAvailableFreelancersForSlot: () => [],
  } as any;

  const to24 = (slot: string) => {
    // e.g., "9:30 AM" -> "09:30", "12:00 PM" -> "12:00", "12:00 AM" -> "00:00"
    const [time, meridiem] = slot.split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr,10);
    const m = parseInt(mStr||'0',10);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
  };

  useEffect(() => {
    const refresh = async () => {
      if (!selectedDate) return;
      const base = getAvailability(selectedDate);
      const key = selectedDate.toISOString().slice(0,10);
      const booked = await listBookedSlots(salon.id, key);
      // filter out booked
      let slots = base.filter((t) => !booked.includes(t));
      // if home visit option is possible, further filter slots where at least one freelancer is available
      const duration = selectedServices.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0) || 60;
      const homeFiltered = slots.filter((slot) => {
        if (marketplace.getAvailableFreelancersForSlot) {
          try {
            return marketplace.getAvailableFreelancersForSlot(String(salon.id), key, to24(slot), duration).length > 0;
          } catch (e) { return false; }
        }
        if (marketplace.isHomeServiceAvailable) {
          try { return marketplace.isHomeServiceAvailable(String(salon.id), key, to24(slot), duration); } catch (e) { return false; }
        }
        return false;
      });
      // store both full and home-filtered in state depending on selectedLocation
      setAvailableSlots(slots);
      // if currently selected location is home, only keep those slots that pass home availability
      if (selectedLocation === 'home') setAvailableSlots(homeFiltered);
      // if later user toggles location, other logic will run in handleDateSelect
    };
    refresh();
  }, [dateKey, salon.id, selectedDate, selectedLocation, selectedServices]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(undefined);
    if (date) {
      const base = getAvailability(date);
      const key = date.toISOString().slice(0, 10);
      listBookedSlots(salon.id, key).then((booked) => {
        let slots = base.filter((t) => !booked.includes(t));
        const duration = selectedServices.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0) || 60;
        if (selectedLocation === 'home') {
          if (marketplace.getAvailableFreelancersForSlot) {
            slots = slots.filter((slot) => {
              try { return marketplace.getAvailableFreelancersForSlot(String(salon.id), key, to24(slot), duration).length > 0; } catch { return false; }
            });
          } else if (marketplace.isHomeServiceAvailable) {
            slots = slots.filter(s => marketplace.isHomeServiceAvailable(String(salon.id), key, to24(s), duration));
          } else {
            slots = [];
          }
        }
        setAvailableSlots(slots);
      });
    }
  };

  const navigate = useNavigate();

  const handleBooking = () => {
    const selected = services.filter(s => selectedServiceIds.includes(s.id));
    if (selectedDate && selectedTime && selected.length > 0) {
      const key = selectedDate.toISOString().slice(0, 10);
      const names = selected.map(s => s.name);
      const parsePrice = (p: string) => parseInt(p.replace(/[^\d]/g, "")) || 0;
      const baseTotal = selected.reduce((sum, s) => sum + parsePrice(s.price), 0);
      const total = baseTotal + (selectedLocation === "home" ? 100 : 0);
      // Navigate to checkout and initiate payment workflow
      const bookingId = `BKG-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
      const payload = {
        bookingId,
        amount: total,
        storeId: String(salon.id),
        salonName: salon.name,
        salonAddress: salon.address,
        serviceId: selectedServices[0]?.id ? String(selectedServices[0].id) : undefined,
        services: selectedServices.map(s=>s.name),
        date: selectedDate ? selectedDate.toISOString().slice(0,10) : undefined,
        time: selectedTime,
        location: selectedLocation,
      };
      // Open checkout page and let Checkout component dispatch the create event
      navigate('/checkout', { state: { bookingPayload: payload } });
      onClose();
    }
  };

  const parsePrice = (p: string) => parseInt(p.replace(/[^\d]/g, "")) || 0;
  const baseTotal = selectedServices.reduce((sum, s) => sum + parsePrice(s.price), 0);
  const total = baseTotal + (selectedLocation === "home" ? 100 : 0);
  const priceDisplay = `₹${total.toLocaleString('en-IN')}`;
  const totalDuration = selectedServices.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0);
  const allowSalon = selectedServices.length === 0 ? true : selectedServices.every(s => s.salonVisit);
  const allowHomeByService = selectedServices.length === 0 ? true : selectedServices.every(s => s.homeVisit);
  // check if any home slots available for selected date
  const anyHomeSlotAvailable = (() => {
    try {
      const key = selectedDate ? selectedDate.toISOString().slice(0,10) : undefined;
      if (!key) return false;
      const duration = selectedServices.reduce((sum, s) => sum + (parseInt(s.duration) || 0), 0) || 60;
      if (marketplace.getAvailableFreelancersForSlot) {
        return availableSlots.some(slot => {
          try { return marketplace.getAvailableFreelancersForSlot(String(salon.id), key, to24(slot), duration).length > 0; } catch { return false; }
        });
      }
      if (!marketplace.isHomeServiceAvailable) return false;
      return availableSlots.some(slot => marketplace.isHomeServiceAvailable(String(salon.id), key, to24(slot), duration));
    } catch (e) { return false; }
  })();
  const allowHome = allowHomeByService && anyHomeSlotAvailable;
  const canBook = Boolean(selectedDate && selectedTime && selectedServices.length > 0);

  // Render even if no service preselected; user can choose from list
  if (!services || services.length === 0) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-mens-primary">
            Book Services
          </DialogTitle>
          <div className="flex items-center space-x-2 text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{salon.name} • {salon.address}</span>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Service Details */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedServices.length > 0 ? `${selectedServices.length} selected${totalDuration ? ` • ${totalDuration} min` : ''}` : 'Select services'}</span>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {priceDisplay}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{totalDuration ? `${totalDuration} min` : '—'}</span>
                  </div>
                </div>

                {/* Location Selection */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Choose Service(s):</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {services.map((svc) => {
                      const selected = selectedServiceIds.includes(svc.id);
                      return (
                        <button
                          key={svc.id}
                          onClick={() => {
                            setSelectedServiceIds((prev) => prev.includes(svc.id) ? prev.filter((id) => id !== svc.id) : [...prev, svc.id]);
                          }}
                          className={`p-3 border rounded-lg flex items-center justify-between transition-all ${selected ? "border-mens-primary bg-mens-secondary" : "border-border hover:border-mens-primary"}`}
                        >
                          <div className="text-left">
                            <div className="font-medium">{svc.name}</div>
                            <div className="text-xs text-muted-foreground">{svc.duration}</div>
                          </div>
                          <Badge>{svc.price}</Badge>
                        </button>
                      );
                    })}
                  </div>

                  <h4 className="font-semibold mt-6">Choose Location:</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {allowSalon && (
                      <button
                        onClick={() => setSelectedLocation("salon")}
                        className={`p-4 border rounded-lg flex items-center space-x-3 transition-all ${
                          selectedLocation === "salon"
                            ? "border-mens-primary bg-mens-secondary"
                            : "border-border hover:border-mens-primary"
                        }`}
                      >
                        <Building className="w-5 h-5 text-mens-primary" />
                        <div className="text-left">
                          <div className="font-medium">At Salon</div>
                          <div className="text-sm text-muted-foreground">₹{baseTotal.toLocaleString('en-IN')}</div>
                        </div>
                        {selectedLocation === "salon" && (
                          <Check className="w-5 h-5 text-mens-primary ml-auto" />
                        )}
                      </button>
                    )}
                    
                    {/* Home Visit button: always render but disable with reason when not available */}
                    {(() => {
                      const homeDisabledReason = !allowHomeByService ? 'Selected services are not available for home visits' : (!anyHomeSlotAvailable ? 'No freelancers/slots available for selected date' : '');
                      const homeDisabled = Boolean(homeDisabledReason);
                      return (
                        <button
                          onClick={() => !homeDisabled && setSelectedLocation("home")}
                          disabled={homeDisabled}
                          title={homeDisabled ? homeDisabledReason : 'Home visit available'}
                          className={`p-4 border rounded-lg flex items-center space-x-3 transition-all ${
                            selectedLocation === "home"
                              ? "border-mens-primary bg-mens-secondary"
                              : "border-border hover:border-mens-primary"
                          } ${homeDisabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Home className="w-5 h-5 text-mens-primary" />
                          <div className="text-left">
                            <div className="font-medium">Home Visit</div>
                            <div className="text-sm text-muted-foreground">₹{(baseTotal + 100).toLocaleString('en-IN')}</div>
                            {homeDisabled && <div className="text-xs text-rose-600 mt-1">{homeDisabledReason}</div>}
                          </div>
                          {selectedLocation === "home" && !homeDisabled && (
                            <Check className="w-5 h-5 text-mens-primary ml-auto" />
                          )}
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date & Time Selection */}
          <div className="space-y-6">
            {/* Calendar */}
            <Card>
              <CardHeader>
                <CardTitle>Select Date</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => {
                    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                    const today = new Date();
                    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    return d < t; // only disable before today
                  }}
                  className="rounded-md border"
                />
                <div className="flex justify-end mt-2">
                  <Button size="sm" variant="outline" onClick={() => handleDateSelect(new Date())}>Today</Button>
                </div>
              </CardContent>
            </Card>

            {/* Time Slots */}
            {selectedDate && (
              <Card>
                <CardHeader>
                  <CardTitle>Available Times</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedDate.toDateString()} • {availableSlots.length} slots available
                  </p>
                </CardHeader>
                <CardContent>
                  {availableSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 text-sm border rounded transition-all ${
                            selectedTime === time
                              ? "border-mens-primary bg-mens-primary text-white"
                              : "border-border hover:border-mens-primary"
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">
                      No available slots for this date
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Booking Summary & Actions */}
        <div className="border-t pt-6">
          <div className="flex items-center justify-between">
            <div>
              {canBook && (
                <div className="text-sm text-muted-foreground">
                  <p><strong>Services:</strong> {selectedServices.map(s => s.name).join(', ')}</p>
                  <p><strong>Date:</strong> {selectedDate?.toDateString()}</p>
                  <p><strong>Time:</strong> {selectedTime}</p>
                  <p><strong>Location:</strong> {selectedLocation === "salon" ? "At Salon" : "Home Visit"}</p>
                  <p><strong>Total:</strong> {priceDisplay}</p>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                onClick={handleBooking}
                disabled={!canBook}
                className="bg-gradient-mens hover:opacity-90"
              >
                Confirm Booking
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BookingModal;
