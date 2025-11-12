import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Edit, Trash2, CheckCircle, PlayCircle } from "lucide-react";

interface Appointment {
  id: string;
  confirmation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  service_ids: string[];
  notes: string | null;
  status: string;
}

interface Service {
  id: string;
  name: string;
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editTime, setEditTime] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00"
  ];

  useEffect(() => {
    checkAuth();
    fetchData();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin/login');
      return;
    }

    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .eq('role', 'admin')
      .single();

    if (!data) {
      await supabase.auth.signOut();
      navigate('/admin/login');
    }
  };

  const fetchData = async () => {
    try {
      const [appointmentsRes, servicesRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
        supabase
          .from('services')
          .select('id, name')
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setAppointments(appointmentsRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin/login');
  };

  const getServiceNames = (serviceIds: string[]) => {
    return services
      .filter(s => serviceIds.includes(s.id))
      .map(s => s.name)
      .join(', ');
  };

  const handleUpdateStatus = async (appointment: Appointment, newStatus: 'in_progress' | 'complete' | 'cancelled') => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus as any })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send email notification
      const serviceNames = getServiceNames(appointment.service_ids).split(', ');
      
      await supabase.functions.invoke('send-appointment-email', {
        body: {
          to: appointment.customer_email,
          customerName: appointment.customer_name,
          confirmationNumber: appointment.confirmation_number,
          appointmentDate: new Date(appointment.appointment_date).toLocaleDateString(),
          appointmentTime: appointment.appointment_time,
          services: serviceNames,
          action: newStatus === 'in_progress' ? 'in_progress' : newStatus === 'complete' ? 'complete' : 'cancel',
          notes: appointment.notes
        }
      });

      toast({
        title: "Status updated",
        description: `Appointment ${newStatus}`,
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = async () => {
    if (!editingAppointment || !editDate || !editTime) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: editDate.toISOString().split('T')[0],
          appointment_time: editTime
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      // Send update email to customer and admin
      const serviceNames = getServiceNames(editingAppointment.service_ids).split(', ');
      
      await Promise.all([
        supabase.functions.invoke('send-appointment-email', {
          body: {
            to: editingAppointment.customer_email,
            customerName: editingAppointment.customer_name,
            confirmationNumber: editingAppointment.confirmation_number,
            appointmentDate: editDate.toLocaleDateString(),
            appointmentTime: editTime,
            services: serviceNames,
            action: 'update',
            notes: editingAppointment.notes
          }
        })
      ]);

      toast({
        title: "Appointment updated",
        description: "Confirmation emails sent",
      });

      setEditingAppointment(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id);

      if (error) throw error;

      // Send cancellation email
      const serviceNames = getServiceNames(appointment.service_ids).split(', ');
      
      await supabase.functions.invoke('send-appointment-email', {
        body: {
          to: appointment.customer_email,
          customerName: appointment.customer_name,
          confirmationNumber: appointment.confirmation_number,
          appointmentDate: new Date(appointment.appointment_date).toLocaleDateString(),
          appointmentTime: appointment.appointment_time,
          services: serviceNames,
          action: 'cancel',
          notes: appointment.notes
        }
      });

      toast({
        title: "Appointment cancelled",
        description: "Cancellation email sent",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error cancelling appointment",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "default",
      in_progress: "secondary",
      complete: "secondary",
      cancelled: "destructive"
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>

          <Card className="shadow-strong">
            <CardHeader>
              <CardTitle>All Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading appointments...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">No appointments found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Confirmation #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Services</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {appointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-mono text-xs">
                            {appointment.confirmation_number}
                          </TableCell>
                          <TableCell>{appointment.customer_name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{appointment.customer_email}</div>
                              <div className="text-muted-foreground">{appointment.customer_phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              {new Date(appointment.appointment_date).toLocaleDateString()}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {appointment.appointment_time}
                            </div>
                          </TableCell>
                          <TableCell>{getServiceNames(appointment.service_ids)}</TableCell>
                          <TableCell>{getStatusBadge(appointment.status)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingAppointment(appointment);
                                      setEditDate(new Date(appointment.appointment_date));
                                      setEditTime(appointment.appointment_time);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Edit Appointment</DialogTitle>
                                    <DialogDescription>
                                      Update the date and time for this appointment
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <Label>Select New Date</Label>
                                      <Calendar
                                        mode="single"
                                        selected={editDate}
                                        onSelect={setEditDate}
                                        disabled={(date) => date < new Date()}
                                        className="rounded-md border p-3 pointer-events-auto"
                                      />
                                    </div>
                                    <div>
                                      <Label>Select New Time</Label>
                                      <Select value={editTime} onValueChange={setEditTime}>
                                        <SelectTrigger>
                                          <SelectValue />
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
                                    <Button onClick={handleEdit} className="w-full">
                                      Update Appointment
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>

                              {appointment.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(appointment, 'in_progress')}
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}

                              {appointment.status === 'in_progress' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleUpdateStatus(appointment, 'complete')}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}

                              {appointment.status !== 'cancelled' && appointment.status !== 'complete' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleCancel(appointment)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
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