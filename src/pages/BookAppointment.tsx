import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const bookingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20),
  notes: z.string().max(1000).optional(),
});

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
}

export default function BookAppointment() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date>();
  const [timeSlot, setTimeSlot] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, duration_minutes')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading services",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    
    try {
      const validation = bookingSchema.parse({ name, email, phone, notes });
      
      if (selectedServices.length === 0) {
        toast({
          title: "Please select at least one service",
          variant: "destructive",
        });
        return;
      }

      if (!date) {
        toast({
          title: "Please select a date",
          variant: "destructive",
        });
        return;
      }

      if (!timeSlot) {
        toast({
          title: "Please select a time slot",
          variant: "destructive",
        });
        return;
      }

      setSubmitting(true);

      // Check for existing appointments at the same time slot
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('id')
        .eq('appointment_date', date.toISOString().split('T')[0])
        .eq('appointment_time', timeSlot)
        .neq('status', 'cancelled');

      if (checkError) throw checkError;

      if (existingAppointments && existingAppointments.length > 0) {
        toast({
          title: "Time slot unavailable",
          description: "This time slot is already booked. Please select another time.",
          variant: "destructive",
        });
        setSubmitting(false);
        return;
      }

      // Generate confirmation number
      const { data: confData, error: confError } = await supabase
        .rpc('generate_confirmation_number');

      if (confError) throw confError;

      // Create appointment
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          confirmation_number: confData,
          customer_name: validation.name,
          customer_email: validation.email,
          customer_phone: validation.phone,
          appointment_date: date.toISOString().split('T')[0],
          appointment_time: timeSlot,
          service_ids: selectedServices,
          notes: validation.notes || null,
          status: 'pending'
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Send confirmation email
      const selectedServiceNames = services
        .filter(s => selectedServices.includes(s.id))
        .map(s => s.name);

      await supabase.functions.invoke('send-appointment-email', {
        body: {
          to: validation.email,
          customerName: validation.name,
          confirmationNumber: confData,
          appointmentDate: date.toLocaleDateString(),
          appointmentTime: timeSlot,
          services: selectedServiceNames,
          action: 'booking',
          notes: validation.notes
        }
      });

      toast({
        title: "Appointment booked successfully!",
        description: `Your confirmation number is: ${confData}`,
      });

      // Reset form
      setSelectedServices([]);
      setDate(undefined);
      setTimeSlot("");
      setName("");
      setEmail("");
      setPhone("");
      setNotes("");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error booking appointment",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Book Your Appointment</h1>
            <p className="text-xl text-muted-foreground">
              Select your services, choose a time, and we'll take care of the rest
            </p>
          </div>

          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>Appointment Details</CardTitle>
              <CardDescription>
                Fill out the form below to schedule your service
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Services Selection */}
                <div className="space-y-4">
                  <Label>Select Services *</Label>
                  {loading ? (
                    <p className="text-muted-foreground">Loading services...</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {services.map((service) => (
                        <div key={service.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={service.id}
                            checked={selectedServices.includes(service.id)}
                            onCheckedChange={() => toggleService(service.id)}
                          />
                          <label
                            htmlFor={service.id}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {service.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label>Select Date *</Label>
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date() || date.getDay() === 0}
                    className="rounded-md border p-3 pointer-events-auto"
                  />
                </div>

                {/* Time Slot Selection */}
                <div className="space-y-2">
                  <Label htmlFor="timeSlot">Select Time Slot *</Label>
                  <Select value={timeSlot} onValueChange={setTimeSlot}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a time" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Customer Information */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={255}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={20}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific concerns or requests?"
                      maxLength={1000}
                      rows={4}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-accent hover:bg-accent/90"
                  disabled={submitting}
                >
                  {submitting ? "Booking..." : "Book Appointment"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="bg-foreground text-background py-8">
        <div className="container text-center">
          <p className="text-sm">
            © 2025 Rogova Auto Shop. All rights reserved. | 37 Veronica Dr, Halifax, NS
          </p>
        </div>
      </footer>
    </div>
  );
}