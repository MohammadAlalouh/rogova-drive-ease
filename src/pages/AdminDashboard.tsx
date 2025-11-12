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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Edit, Trash2, CheckCircle, PlayCircle, X, Plus, Download } from "lucide-react";

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
  description: string;
  price_range: string;
  duration_minutes: number;
  is_active: boolean;
}

interface CompletedService {
  id: string;
  appointment_id: string;
  services_performed: any;
  items_purchased: string;
  subtotal: number;
  taxes: number;
  total_cost: number;
  notes: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [completedServices, setCompletedServices] = useState<CompletedService[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [editDate, setEditDate] = useState<Date>();
  const [editTime, setEditTime] = useState("");
  const [availableEditTimes, setAvailableEditTimes] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [completionDialogOpen, setCompletionDialogOpen] = useState(false);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [completionData, setCompletionData] = useState({
    servicesPerformed: [] as Array<{ service: string; cost: string }>,
    itemsPurchased: "",
    subtotal: "",
    taxes: "",
    totalCost: "",
    notes: ""
  });
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    price_range: "",
    duration_minutes: 60
  });
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

  // Compute available edit times whenever inputs change
  useEffect(() => {
    if (!editingAppointment || !editDate) return;

    const minutes = (t: string) => parseInt(t.split(':')[0]) * 60 + parseInt(t.split(':')[1]);
    const dateStr = editDate.toISOString().split('T')[0];
    const others = appointments.filter(a => a.id !== editingAppointment.id && a.appointment_date === dateStr && a.status !== 'cancelled');

    const serviceDuration = (ids: string[]) => services.filter(s => ids.includes(s.id)).reduce((sum, s) => sum + s.duration_minutes, 0);
    const currentDuration = serviceDuration(editingAppointment.service_ids);

    const available = timeSlots.filter(slot => {
      const start = minutes(slot);
      const end = start + currentDuration;
      for (const apt of others) {
        const s = minutes(apt.appointment_time);
        const e = s + serviceDuration(apt.service_ids);
        if (start < e && end > s) return false;
      }
      return true;
    });

    setAvailableEditTimes(available);
  }, [editingAppointment, editDate, appointments, services]);

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
      const [appointmentsRes, servicesRes, completedRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
        supabase
          .from('services')
          .select('*'),
        supabase
          .from('completed_services')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (completedRes.error) throw completedRes.error;

      setAppointments(appointmentsRes.data || []);
      setServices(servicesRes.data || []);
      setCompletedServices(completedRes.data || []);
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

  const handleUpdateStatus = async (appointment: Appointment, newStatus: 'in_progress' | 'cancelled') => {
    if (actionLoading) return;
    setActionLoading(appointment.id);
    
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
          action: newStatus === 'in_progress' ? 'in_progress' : 'cancel',
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
    } finally {
      setActionLoading(null);
    }
  };

  const handleCompleteAppointment = async () => {
    if (!completingAppointment || actionLoading) return;
    setActionLoading(completingAppointment.id);

    try {
      // Calculate totals
      const subtotal = parseFloat(completionData.subtotal) || 0;
      const taxes = parseFloat(completionData.taxes) || 0;
      const totalCost = parseFloat(completionData.totalCost) || subtotal + taxes;

      // Convert services performed to proper format
      const servicesPerformed = completionData.servicesPerformed
        .filter(s => s.service && s.cost)
        .map(s => ({ service: s.service, cost: parseFloat(s.cost) || 0 }));

      // Save to completed_services table
      const { error: completedError } = await supabase
        .from('completed_services')
        .insert({
          appointment_id: completingAppointment.id,
          services_performed: servicesPerformed,
          items_purchased: completionData.itemsPurchased || null,
          subtotal,
          taxes,
          total_cost: totalCost,
          notes: completionData.notes || null
        });

      if (completedError) throw completedError;

      // Update appointment status
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'complete' })
        .eq('id', completingAppointment.id);

      if (updateError) throw updateError;

      // Send detailed invoice email
      const serviceNames = getServiceNames(completingAppointment.service_ids).split(', ');
      
      await supabase.functions.invoke('send-appointment-email', {
        body: {
          to: completingAppointment.customer_email,
          customerName: completingAppointment.customer_name,
          confirmationNumber: completingAppointment.confirmation_number,
          appointmentDate: new Date(completingAppointment.appointment_date).toLocaleDateString(),
          appointmentTime: completingAppointment.appointment_time,
          services: serviceNames,
          action: 'complete',
          notes: completingAppointment.notes,
          invoice: {
            servicesPerformed,
            itemsPurchased: completionData.itemsPurchased,
            subtotal,
            taxes,
            totalCost
          }
        }
      });

      toast({
        title: "Appointment completed",
        description: "Invoice sent to customer",
      });

      setCompletionDialogOpen(false);
      setCompletingAppointment(null);
      setCompletionData({
        servicesPerformed: [],
        itemsPurchased: "",
        subtotal: "",
        taxes: "",
        totalCost: "",
        notes: ""
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error completing appointment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleEdit = async () => {
    if (!editingAppointment || !editDate || !editTime || actionLoading) return;
    setActionLoading(editingAppointment.id);

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: editDate.toISOString().split('T')[0],
          appointment_time: editTime
        })
        .eq('id', editingAppointment.id);

      if (error) throw error;

      // Send update email
      const serviceNames = getServiceNames(editingAppointment.service_ids).split(', ');
      
      await supabase.functions.invoke('send-appointment-email', {
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
      });

      toast({
        title: "Appointment updated",
        description: "Confirmation email sent",
      });

      setEditingAppointment(null);
      setDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error updating appointment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    if (actionLoading) return;
    setActionLoading(appointment.id);

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
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (appointment: Appointment) => {
    if (!confirm("Are you sure you want to permanently delete this appointment? This cannot be undone.")) return;
    if (actionLoading) return;
    setActionLoading(appointment.id);

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointment.id);

      if (error) throw error;

      toast({
        title: "Appointment deleted",
        description: "Appointment permanently removed",
      });

      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting appointment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSaveService = async () => {
    if (actionLoading) return;
    setActionLoading("service");

    try {
      if (editingService) {
        const { error } = await supabase
          .from('services')
          .update({
            name: newService.name,
            description: newService.description,
            price_range: newService.price_range,
            duration_minutes: newService.duration_minutes
          })
          .eq('id', editingService.id);

        if (error) throw error;
        toast({ title: "Service updated" });
      } else {
        const { error } = await supabase
          .from('services')
          .insert({
            name: newService.name,
            description: newService.description,
            price_range: newService.price_range,
            duration_minutes: newService.duration_minutes,
            is_active: true
          });

        if (error) throw error;
        toast({ title: "Service added" });
      }

      setServiceDialogOpen(false);
      setEditingService(null);
      setNewService({ name: "", description: "", price_range: "", duration_minutes: 60 });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error saving service",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return;
    if (actionLoading) return;
    setActionLoading(serviceId);

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      toast({ title: "Service deleted" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deleting service",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
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

  const exportToCSV = () => {
    const headers = ["Date", "Confirmation #", "Customer", "Services", "Items Purchased", "Subtotal", "Taxes", "Total", "Notes"];
    
    const rows = completedServices.map(cs => {
      const appointment = appointments.find(a => a.id === cs.appointment_id);
      const servicesPerformed = cs.services_performed.map((s: any) => `${s.service}: $${s.cost}`).join('; ');
      
      return [
        cs.created_at ? new Date(cs.created_at).toLocaleDateString() : '',
        appointment?.confirmation_number || '',
        appointment?.customer_name || '',
        servicesPerformed,
        cs.items_purchased || '',
        `$${cs.subtotal?.toFixed(2) || '0.00'}`,
        `$${cs.taxes?.toFixed(2) || '0.00'}`,
        `$${cs.total_cost?.toFixed(2) || '0.00'}`,
        cs.notes || ''
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `completed-services-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "CSV file downloaded",
    });
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

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList>
              <TabsTrigger value="appointments">Appointments</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
              <TabsTrigger value="completed">Completed Services</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
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
                            <div className="flex gap-2 flex-wrap">
                              {appointment.status !== 'complete' && appointment.status !== 'cancelled' && (
                                <Dialog open={dialogOpen && editingAppointment?.id === appointment.id} onOpenChange={(open) => {
                                  setDialogOpen(open);
                                  if (!open) setEditingAppointment(null);
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={actionLoading === appointment.id}
                                      onClick={() => {
                                        setEditingAppointment(appointment);
                                        setEditDate(new Date(appointment.appointment_date));
                                        setEditTime(appointment.appointment_time);
                                        setDialogOpen(true);
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
                                          className="rounded-md border p-3"
                                        />
                                      </div>
                                      <div>
                                        <Label>Select New Time</Label>
                                        <Select value={editTime} onValueChange={setEditTime}>
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {availableEditTimes.map((slot) => (
                                              <SelectItem key={slot} value={slot}>
                                                {slot}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <Button onClick={handleEdit} className="w-full" disabled={actionLoading === appointment.id}>
                                        {actionLoading === appointment.id ? "Updating..." : "Update Appointment"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}

                              {appointment.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={actionLoading === appointment.id}
                                  onClick={() => handleUpdateStatus(appointment, 'in_progress')}
                                  title="Start Progress"
                                >
                                  <PlayCircle className="h-4 w-4" />
                                </Button>
                              )}

                              {appointment.status === 'in_progress' && (
                                <Dialog open={completionDialogOpen && completingAppointment?.id === appointment.id} onOpenChange={(open) => {
                                  setCompletionDialogOpen(open);
                                  if (!open) {
                                    setCompletingAppointment(null);
                                    setCompletionData({
                                      servicesPerformed: [],
                                      itemsPurchased: "",
                                      subtotal: "",
                                      taxes: "",
                                      totalCost: "",
                                      notes: ""
                                    });
                                  }
                                }}>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="default"
                                      disabled={actionLoading === appointment.id}
                                      onClick={() => {
                                        setCompletingAppointment(appointment);
                                        setCompletionDialogOpen(true);
                                      }}
                                      title="Mark Complete"
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-h-[80vh] overflow-y-auto">
                                    <DialogHeader>
                                      <DialogTitle>Complete Appointment</DialogTitle>
                                      <DialogDescription>
                                        Add service details and final payment (all fields optional)
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Services Performed</Label>
                                        <div className="space-y-2">
                                          {completionData.servicesPerformed.map((item, index) => (
                                            <div key={index} className="flex gap-2">
                                              <Input
                                                placeholder="Service name"
                                                value={item.service}
                                                onChange={(e) => {
                                                  const updated = [...completionData.servicesPerformed];
                                                  updated[index].service = e.target.value;
                                                  setCompletionData({ ...completionData, servicesPerformed: updated });
                                                }}
                                              />
                                              <Input
                                                placeholder="Cost"
                                                type="number"
                                                step="0.01"
                                                value={item.cost}
                                                onChange={(e) => {
                                                  const updated = [...completionData.servicesPerformed];
                                                  updated[index].cost = e.target.value;
                                                  setCompletionData({ ...completionData, servicesPerformed: updated });
                                                }}
                                              />
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  const updated = completionData.servicesPerformed.filter((_, i) => i !== index);
                                                  setCompletionData({ ...completionData, servicesPerformed: updated });
                                                }}
                                              >
                                                <X className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          ))}
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                              setCompletionData({
                                                ...completionData,
                                                servicesPerformed: [...completionData.servicesPerformed, { service: "", cost: "" }]
                                              });
                                            }}
                                          >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Service
                                          </Button>
                                        </div>
                                      </div>

                                      <div>
                                        <Label>Items Purchased</Label>
                                        <Textarea
                                          placeholder="List any parts or items..."
                                          value={completionData.itemsPurchased}
                                          onChange={(e) => setCompletionData({ ...completionData, itemsPurchased: e.target.value })}
                                        />
                                      </div>

                                      <div className="grid grid-cols-3 gap-4">
                                        <div>
                                          <Label>Subtotal</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={completionData.subtotal}
                                            onChange={(e) => setCompletionData({ ...completionData, subtotal: e.target.value })}
                                          />
                                        </div>
                                        <div>
                                          <Label>Taxes</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={completionData.taxes}
                                            onChange={(e) => setCompletionData({ ...completionData, taxes: e.target.value })}
                                          />
                                        </div>
                                        <div>
                                          <Label>Total</Label>
                                          <Input
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={completionData.totalCost}
                                            onChange={(e) => setCompletionData({ ...completionData, totalCost: e.target.value })}
                                          />
                                        </div>
                                      </div>

                                      <div>
                                        <Label>Notes</Label>
                                        <Textarea
                                          placeholder="Additional notes..."
                                          value={completionData.notes}
                                          onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                                        />
                                      </div>

                                      <Button onClick={handleCompleteAppointment} className="w-full" disabled={actionLoading === appointment.id}>
                                        {actionLoading === appointment.id ? "Completing..." : "Complete Appointment"}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}

                              {appointment.status !== 'cancelled' && appointment.status !== 'complete' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={actionLoading === appointment.id}
                                  onClick={() => handleCancel(appointment)}
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === appointment.id}
                                onClick={() => handleDelete(appointment)}
                                title="Delete Permanently"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="completed">
          <Card className="shadow-strong">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Completed Services</CardTitle>
              <Button onClick={exportToCSV} disabled={completedServices.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export to CSV
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading completed services...</p>
              ) : completedServices.length === 0 ? (
                <p className="text-muted-foreground">No completed services found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Confirmation #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Services Performed</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {completedServices.map((cs) => {
                        const appointment = appointments.find(a => a.id === cs.appointment_id);
                        return (
                          <TableRow key={cs.id}>
                            <TableCell>
                              {new Date(cs.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              {appointment?.confirmation_number}
                            </TableCell>
                            <TableCell>{appointment?.customer_name}</TableCell>
                            <TableCell>
                              {cs.services_performed.map((s: any) => (
                                <div key={s.service} className="text-sm">
                                  {s.service}: ${s.cost.toFixed(2)}
                                </div>
                              ))}
                            </TableCell>
                            <TableCell className="text-sm">{cs.items_purchased || '-'}</TableCell>
                            <TableCell className="font-medium">${cs.total_cost?.toFixed(2) || '0.00'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="shadow-strong">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Services Management</CardTitle>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingService(null);
                    setNewService({ name: "", description: "", price_range: "", duration_minutes: 60 });
                  }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Service Name</Label>
                      <Input
                        value={newService.name}
                        onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                        placeholder="e.g., Oil Change"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={newService.description}
                        onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                        placeholder="Describe the service..."
                      />
                    </div>
                    <div>
                      <Label>Price Range</Label>
                      <Input
                        value={newService.price_range}
                        onChange={(e) => setNewService({ ...newService, price_range: e.target.value })}
                        placeholder="e.g., $50-$80"
                      />
                    </div>
                    <div>
                      <Label>Duration (minutes)</Label>
                      <Input
                        type="number"
                        value={newService.duration_minutes}
                        onChange={(e) => setNewService({ ...newService, duration_minutes: parseInt(e.target.value) })}
                      />
                    </div>
                    <Button onClick={handleSaveService} className="w-full" disabled={actionLoading === "service"}>
                      {actionLoading === "service" ? "Saving..." : (editingService ? "Update Service" : "Add Service")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p>Loading services...</p>
              ) : services.length === 0 ? (
                <p className="text-muted-foreground">No services found</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price Range</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {services.map((service) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell>{service.description}</TableCell>
                          <TableCell>{service.price_range}</TableCell>
                          <TableCell>{service.duration_minutes} min</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === service.id}
                                onClick={() => {
                                  setEditingService(service);
                                  setNewService({
                                    name: service.name,
                                    description: service.description,
                                    price_range: service.price_range,
                                    duration_minutes: service.duration_minutes
                                  });
                                  setServiceDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={actionLoading === service.id}
                                onClick={() => handleDeleteService(service.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>
      </Tabs>
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