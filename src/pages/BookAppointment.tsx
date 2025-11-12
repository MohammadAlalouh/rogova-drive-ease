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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { z } from "zod";

const bookingSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  phone: z.string().trim().min(10, "Phone number must be at least 10 digits").max(20),
  carMake: z.string().trim().min(1, "Car make is required").max(50),
  carModel: z.string().trim().min(1, "Car model is required").max(50),
  carYear: z.number().min(1900, "Invalid year").max(new Date().getFullYear() + 1),
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
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState(new Date().getFullYear());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Lookup appointment states
  const [lookupEmail, setLookupEmail] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [lookupConfirmation, setLookupConfirmation] = useState("");
  const [foundAppointment, setFoundAppointment] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [editMode, setEditMode] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00"
  ];
  const [availableTimes, setAvailableTimes] = useState<string[]>(timeSlots);
  const [dayAppointments, setDayAppointments] = useState<Array<{ appointment_time: string; service_ids: string[]; status: string }>>([]);

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

  // Recompute availability whenever date or selected services change
  useEffect(() => {
    const compute = async () => {
      if (!date) {
        setAvailableTimes(timeSlots);
        setDayAppointments([]);
        return;
      }

      const dateStr = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('appointments')
        .select('appointment_time, service_ids, status')
        .eq('appointment_date', dateStr)
        .neq('status', 'cancelled');

      if (!error) {
        setDayAppointments(data || []);
      }

      const totalDuration = services
        .filter(s => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.duration_minutes, 0);

      if (selectedServices.length === 0 || totalDuration === 0) {
        setAvailableTimes(timeSlots);
        return;
      }

      const minutes = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);

      const available = timeSlots.filter(slot => {
        const start = minutes(slot);
        const end = start + totalDuration;

        for (const apt of (data || [])) {
          const aptStart = minutes(apt.appointment_time);
          const aptDuration = services
            .filter(s => apt.service_ids.includes(s.id))
            .reduce((sum, s) => sum + s.duration_minutes, 0);
          const aptEnd = aptStart + aptDuration;

          if (start < aptEnd && end > aptStart) {
            return false; // overlap, slot unavailable
          }
        }
        return true;
      });

      setAvailableTimes(available);
    };

    compute();
  }, [date, selectedServices, services]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    
    try {
      const validation = bookingSchema.parse({ name, email, phone, carMake, carModel, carYear, notes });
      
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

      // Calculate total duration for selected services
      const totalDuration = services
        .filter(s => selectedServices.includes(s.id))
        .reduce((sum, s) => sum + s.duration_minutes, 0);

      // Check for overlapping appointments
      const { data: existingAppointments, error: checkError } = await supabase
        .from('appointments')
        .select('appointment_time, service_ids')
        .eq('appointment_date', date.toISOString().split('T')[0])
        .neq('status', 'cancelled');

      if (checkError) throw checkError;

      // Check if new appointment overlaps with existing ones
      if (existingAppointments && existingAppointments.length > 0) {
        const newStartMinutes = parseInt(timeSlot.split(':')[0]) * 60 + parseInt(timeSlot.split(':')[1]);
        const newEndMinutes = newStartMinutes + totalDuration;

        for (const apt of existingAppointments) {
          const existingStartMinutes = parseInt(apt.appointment_time.split(':')[0]) * 60 + 
                                       parseInt(apt.appointment_time.split(':')[1]);
          
          // Calculate duration for existing appointment
          const existingDuration = services
            .filter(s => apt.service_ids.includes(s.id))
            .reduce((sum, s) => sum + s.duration_minutes, 0);
          
          const existingEndMinutes = existingStartMinutes + existingDuration;

          // Check for overlap
          const overlaps = (newStartMinutes < existingEndMinutes) && (newEndMinutes > existingStartMinutes);
          
          if (overlaps) {
            toast({
              title: "Time slot unavailable",
              description: "This time slot conflicts with an existing appointment. Please select another time.",
              variant: "destructive",
            });
            setSubmitting(false);
            return;
          }
        }
      }

      // Generate confirmation number
      const { data: confData, error: confError } = await supabase
        .rpc('generate_confirmation_number');

      if (confError) throw confError;

      // Create appointment
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          confirmation_number: confData,
          customer_name: validation.name,
          customer_email: validation.email,
          customer_phone: validation.phone,
          car_make: validation.carMake,
          car_model: validation.carModel,
          car_year: validation.carYear,
          appointment_date: date.toISOString().split('T')[0],
          appointment_time: timeSlot,
          service_ids: selectedServices,
          notes: validation.notes || null,
          status: 'pending'
        });

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
      setCarMake("");
      setCarModel("");
      setCarYear(new Date().getFullYear());
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

  const handleLookupAppointment = async () => {
    if (!lookupConfirmation || (!lookupEmail && !lookupPhone)) {
      toast({
        title: "Missing information",
        description: "Please provide confirmation number and either email or phone",
        variant: "destructive",
      });
      return;
    }

    setLookingUp(true);
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('confirmation_number', lookupConfirmation.toUpperCase())
        .neq('status', 'cancelled');

      if (lookupEmail) {
        query = query.eq('customer_email', lookupEmail);
      } else if (lookupPhone) {
        query = query.eq('customer_phone', lookupPhone);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Appointment not found",
          description: "No appointment found with the provided information",
          variant: "destructive",
        });
        setFoundAppointment(null);
      } else {
        setFoundAppointment(data);
        toast({
          title: "Appointment found!",
          description: "You can now view, edit, or cancel your appointment",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error looking up appointment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLookingUp(false);
    }
  };

  const handleUpdateAppointment = async () => {
    if (!foundAppointment) return;

    try {
      const validation = bookingSchema.parse({ 
        name: foundAppointment.customer_name, 
        email: foundAppointment.customer_email, 
        phone: foundAppointment.customer_phone, 
        notes: foundAppointment.notes 
      });

      const { error } = await supabase
        .from('appointments')
        .update({
          customer_name: validation.name,
          customer_email: validation.email,
          customer_phone: validation.phone,
          appointment_date: foundAppointment.appointment_date,
          appointment_time: foundAppointment.appointment_time,
          notes: validation.notes,
        })
        .eq('id', foundAppointment.id);

      if (error) throw error;

      toast({
        title: "Appointment updated!",
        description: "Your appointment has been successfully updated",
      });
      setEditMode(false);
    } catch (error: any) {
      toast({
        title: "Error updating appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancelAppointment = async () => {
    if (!foundAppointment) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', foundAppointment.id);

      if (error) throw error;

      // Send cancellation email
      const selectedServiceNames = services
        .filter(s => foundAppointment.service_ids.includes(s.id))
        .map(s => s.name);

      await supabase.functions.invoke('send-appointment-email', {
        body: {
          to: foundAppointment.customer_email,
          customerName: foundAppointment.customer_name,
          confirmationNumber: foundAppointment.confirmation_number,
          appointmentDate: new Date(foundAppointment.appointment_date).toLocaleDateString(),
          appointmentTime: foundAppointment.appointment_time,
          services: selectedServiceNames,
          action: 'cancel',
        }
      });

      toast({
        title: "Appointment cancelled",
        description: "Your appointment has been cancelled successfully",
      });
      
      setFoundAppointment(null);
      setLookupEmail("");
      setLookupPhone("");
      setLookupConfirmation("");
    } catch (error: any) {
      toast({
        title: "Error cancelling appointment",
        description: error.message,
        variant: "destructive",
      });
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
              Select your services, choose a time, and manage your bookings
            </p>
          </div>

          <Tabs defaultValue="book" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="book">Book New Appointment</TabsTrigger>
              <TabsTrigger value="manage">Manage Appointment</TabsTrigger>
            </TabsList>

            <TabsContent value="book">
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
                    <Select value={timeSlot} onValueChange={setTimeSlot} disabled={!date || selectedServices.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder={(!date || selectedServices.length === 0) ? "Select date and services first" : (availableTimes.length ? "Choose a time" : "No times available") } />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTimes.map((slot) => (
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
                    <Label htmlFor="carMake">Car Make *</Label>
                    <Input
                      id="carMake"
                      value={carMake}
                      onChange={(e) => setCarMake(e.target.value)}
                      placeholder="e.g., Toyota, Honda"
                      required
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carModel">Car Model *</Label>
                    <Input
                      id="carModel"
                      value={carModel}
                      onChange={(e) => setCarModel(e.target.value)}
                      placeholder="e.g., Camry, Civic"
                      required
                      maxLength={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="carYear">Car Year *</Label>
                    <Input
                      id="carYear"
                      type="number"
                      value={carYear}
                      onChange={(e) => setCarYear(parseInt(e.target.value))}
                      required
                      min={1900}
                      max={new Date().getFullYear() + 1}
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
            </TabsContent>

            <TabsContent value="manage">
              <Card className="shadow-strong">
                <CardHeader>
                  <CardTitle>Looking for Your Appointment?</CardTitle>
                  <CardDescription>
                    Enter your confirmation number and contact information to view, edit, or cancel your appointment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!foundAppointment ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="lookupConfirmation">Confirmation Number *</Label>
                        <Input
                          id="lookupConfirmation"
                          placeholder="CONF-XXXXXXXX"
                          value={lookupConfirmation}
                          onChange={(e) => setLookupConfirmation(e.target.value.toUpperCase())}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="lookupEmail">Email Address</Label>
                        <Input
                          id="lookupEmail"
                          type="email"
                          placeholder="your@email.com"
                          value={lookupEmail}
                          onChange={(e) => setLookupEmail(e.target.value)}
                        />
                      </div>

                      <div className="text-center text-muted-foreground">OR</div>

                      <div className="space-y-2">
                        <Label htmlFor="lookupPhone">Phone Number</Label>
                        <Input
                          id="lookupPhone"
                          type="tel"
                          placeholder="(123) 456-7890"
                          value={lookupPhone}
                          onChange={(e) => setLookupPhone(e.target.value)}
                        />
                      </div>

                      <Button
                        onClick={handleLookupAppointment}
                        disabled={lookingUp}
                        className="w-full bg-accent hover:bg-accent/90"
                      >
                        {lookingUp ? "Looking up..." : "Find My Appointment"}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="p-4 bg-muted rounded-lg space-y-3">
                        <div>
                          <Label className="text-muted-foreground">Confirmation Number</Label>
                          <p className="font-semibold">{foundAppointment.confirmation_number}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status</Label>
                          <p className="font-semibold capitalize">{foundAppointment.status}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Date & Time</Label>
                          <p className="font-semibold">
                            {new Date(foundAppointment.appointment_date).toLocaleDateString()} at {foundAppointment.appointment_time}
                          </p>
                        </div>
                      </div>

                      {editMode ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="editName">Name</Label>
                            <Input
                              id="editName"
                              value={foundAppointment.customer_name}
                              onChange={(e) => setFoundAppointment({...foundAppointment, customer_name: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editEmail">Email</Label>
                            <Input
                              id="editEmail"
                              type="email"
                              value={foundAppointment.customer_email}
                              onChange={(e) => setFoundAppointment({...foundAppointment, customer_email: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editPhone">Phone</Label>
                            <Input
                              id="editPhone"
                              type="tel"
                              value={foundAppointment.customer_phone}
                              onChange={(e) => setFoundAppointment({...foundAppointment, customer_phone: e.target.value})}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="editNotes">Notes</Label>
                            <Textarea
                              id="editNotes"
                              value={foundAppointment.notes || ""}
                              onChange={(e) => setFoundAppointment({...foundAppointment, notes: e.target.value})}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleUpdateAppointment} className="flex-1 bg-accent hover:bg-accent/90">
                              Save Changes
                            </Button>
                            <Button onClick={() => setEditMode(false)} variant="outline" className="flex-1">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Customer Name</Label>
                            <p>{foundAppointment.customer_name}</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Email</Label>
                            <p>{foundAppointment.customer_email}</p>
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <p>{foundAppointment.customer_phone}</p>
                          </div>
                          {foundAppointment.notes && (
                            <div className="space-y-2">
                              <Label>Notes</Label>
                              <p>{foundAppointment.notes}</p>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={() => setEditMode(true)} variant="outline" className="flex-1">
                              Edit Appointment
                            </Button>
                            <Button onClick={handleCancelAppointment} variant="destructive" className="flex-1">
                              Cancel Appointment
                            </Button>
                          </div>
                          <Button 
                            onClick={() => {
                              setFoundAppointment(null);
                              setLookupEmail("");
                              setLookupPhone("");
                              setLookupConfirmation("");
                            }} 
                            variant="ghost" 
                            className="w-full"
                          >
                            Look Up Another Appointment
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <footer className="bg-foreground text-background py-8">
        <div className="container text-center space-y-2">
          <p className="text-sm">
            © 2025 Rogova Auto Shop. All rights reserved. | 37 Veronica Dr, Halifax, NS
          </p>
          <button
            onClick={() => navigate('/admin/login')}
            className="text-sm text-background/70 hover:text-background underline"
          >
            ADMIN LOG IN
          </button>
        </div>
      </footer>
    </div>
  );
}