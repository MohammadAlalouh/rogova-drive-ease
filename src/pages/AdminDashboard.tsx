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
import { Checkbox } from "@/components/ui/checkbox";

interface Appointment {
  id: string;
  confirmation_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  service_ids: string[];
  car_make: string;
  car_model: string;
  car_year: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Service {
  id: string;
  name: string;
  description: string;
  price_range: string;
  duration_minutes: number;
  is_active: boolean;
}

interface Staff {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

interface CompletedService {
  id: string;
  appointment_id: string | null;
  services_performed: any;
  items_purchased: any;
  staff_ids: string[];
  hours_worked: number;
  staff_hours: { [key: string]: number };
  subtotal: number;
  taxes: number;
  total_cost: number;
  notes: string | null;
  created_at: string;
  payment_method: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  car_make: string | null;
  car_model: string | null;
  car_year: number | null;
  appointment_date: string | null;
  appointment_time: string | null;
  confirmation_number: string | null;
}

interface GroupedCompletedServices {
  [key: string]: CompletedService[];
}

export default function AdminDashboard() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
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
    itemsPurchased: [] as Array<{ name: string; cost: string }>,
    selectedStaff: [] as string[],
    staffHours: {} as { [key: string]: string },
    taxRate: "14",
    discount: "",
    notes: "",
    paymentMethod: "cash" as string
  });
  const [groupBy, setGroupBy] = useState<"month" | "staff">("month");
  const [staffExportDialogOpen, setStaffExportDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [appointmentView, setAppointmentView] = useState<"all" | "by-day" | "today">("today");
  const [addAppointmentDialogOpen, setAddAppointmentDialogOpen] = useState(false);
  const [newAppointment, setNewAppointment] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    carMake: "",
    carModel: "",
    carYear: new Date().getFullYear(),
    serviceIds: [] as string[],
    appointmentDate: undefined as Date | undefined,
    appointmentTime: "",
    notes: "",
    sendEmail: true
  });
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    phone: ""
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
      const [appointmentsRes, servicesRes, staffRes, completedRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('*')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true }),
        supabase
          .from('services')
          .select('*'),
        supabase
          .from('staff' as any)
          .select('*')
          .order('name'),
        supabase
          .from('completed_services')
          .select('*')
          .order('created_at', { ascending: false })
      ]);

      if (appointmentsRes.error) throw appointmentsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;
      if (completedRes.error) throw completedRes.error;

      setAppointments(appointmentsRes.data || []);
      setServices(servicesRes.data || []);
      setStaff(staffRes.data as any || []);
      setCompletedServices(completedRes.data as any || []);
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
          carMake: appointment.car_make,
          carModel: appointment.car_model,
          carYear: appointment.car_year,
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
      const servicesPerformed = completionData.servicesPerformed
        .filter(s => s.service && s.cost)
        .map(s => ({ service: s.service, cost: parseFloat(s.cost) || 0 }));
      
      const itemsPurchased = completionData.itemsPurchased
        .filter(i => i.name && i.cost)
        .map(i => ({ name: i.name, cost: parseFloat(i.cost) || 0 }));

      const servicesSubtotal = servicesPerformed.reduce((sum, s) => sum + s.cost, 0);
      const itemsSubtotal = itemsPurchased.reduce((sum, i) => sum + i.cost, 0);
      const taxRate = parseFloat(completionData.taxRate) || 0;
      const taxes = servicesSubtotal * (taxRate / 100);
      const discount = parseFloat(completionData.discount) || 0;
      const totalCost = servicesSubtotal + itemsSubtotal + taxes - discount;

      // Convert staffHours to numbers and calculate total
      const staffHoursData: { [key: string]: number } = {};
      let totalHours = 0;
      Object.entries(completionData.staffHours).forEach(([staffId, hours]) => {
        const numHours = parseFloat(hours as string) || 0;
        staffHoursData[staffId] = numHours;
        totalHours += numHours;
      });

      // Save to completed_services table with ALL appointment data copied
      const { error: completedError } = await supabase
        .from('completed_services')
        .insert({
          appointment_id: completingAppointment.id,
          customer_name: completingAppointment.customer_name,
          customer_email: completingAppointment.customer_email,
          customer_phone: completingAppointment.customer_phone,
          car_make: completingAppointment.car_make,
          car_model: completingAppointment.car_model,
          car_year: completingAppointment.car_year,
          appointment_date: completingAppointment.appointment_date,
          appointment_time: completingAppointment.appointment_time,
          confirmation_number: completingAppointment.confirmation_number,
          services_performed: servicesPerformed as any,
          items_purchased: itemsPurchased as any,
          staff_ids: completionData.selectedStaff,
          hours_worked: totalHours,
          staff_hours: staffHoursData as any,
          subtotal: servicesSubtotal + itemsSubtotal,
          taxes,
          total_cost: totalCost,
          notes: completionData.notes || completingAppointment.notes || null,
          payment_method: completionData.paymentMethod as any
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
          carMake: completingAppointment.car_make,
          carModel: completingAppointment.car_model,
          carYear: completingAppointment.car_year,
          action: 'complete',
          notes: completingAppointment.notes,
          invoice: {
            servicesPerformed,
            itemsPurchased,
            servicesSubtotal,
            itemsSubtotal,
            taxes,
            taxRate,
            discount,
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
        itemsPurchased: [],
        selectedStaff: [],
        staffHours: {},
        taxRate: "14",
        discount: "",
        notes: "",
        paymentMethod: "cash"
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
      // Format date in local timezone to avoid timezone shifts
      const localDate = new Date(editDate.getFullYear(), editDate.getMonth(), editDate.getDate());
      const dateStr = localDate.toISOString().split('T')[0];
      
      const { error } = await supabase
        .from('appointments')
        .update({
          appointment_date: dateStr,
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
          carMake: editingAppointment.car_make,
          carModel: editingAppointment.car_model,
          carYear: editingAppointment.car_year,
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
          carMake: appointment.car_make,
          carModel: appointment.car_model,
          carYear: appointment.car_year,
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

  const handleSaveStaff = async () => {
    if (actionLoading) return;
    setActionLoading("staff");

    try {
      if (editingStaff) {
        const { error } = await supabase
          .from('staff' as any)
          .update({
            name: newStaff.name,
            email: newStaff.email || null,
            phone: newStaff.phone || null
          })
          .eq('id', editingStaff.id);

        if (error) throw error;
        toast({ title: "Staff updated" });
      } else {
        const { error } = await supabase
          .from('staff' as any)
          .insert({
            name: newStaff.name,
            email: newStaff.email || null,
            phone: newStaff.phone || null,
            is_active: true
          });

        if (error) throw error;
        toast({ title: "Staff added" });
      }

      setStaffDialogOpen(false);
      setEditingStaff(null);
      setNewStaff({ name: "", email: "", phone: "" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error saving staff",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm("Are you sure you want to deactivate this staff member?")) return;
    if (actionLoading) return;
    setActionLoading(staffId);

    try {
      const { error } = await supabase
        .from('staff' as any)
        .update({ is_active: false })
        .eq('id', staffId);

      if (error) throw error;

      toast({ title: "Staff deactivated" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error deactivating staff",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddAppointment = async () => {
    if (actionLoading) return;

    // Validation
    if (!newAppointment.customerName || !newAppointment.customerPhone) {
      toast({
        title: "Missing information",
        description: "Customer name and phone are required",
        variant: "destructive",
      });
      return;
    }

    if (newAppointment.serviceIds.length === 0) {
      toast({
        title: "No services selected",
        description: "Please select at least one service",
        variant: "destructive",
      });
      return;
    }

    if (!newAppointment.appointmentDate || !newAppointment.appointmentTime) {
      toast({
        title: "Missing date/time",
        description: "Please select appointment date and time",
        variant: "destructive",
      });
      return;
    }

    setActionLoading("add-appointment");

    try {
      // Generate confirmation number
      const { data: confData, error: confError } = await supabase.rpc('generate_confirmation_number');
      if (confError) throw confError;

      // Format date in local timezone to avoid timezone shifts
      const localDate = new Date(newAppointment.appointmentDate.getFullYear(), newAppointment.appointmentDate.getMonth(), newAppointment.appointmentDate.getDate());
      const dateStr = localDate.toISOString().split('T')[0];

      // Insert appointment
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          customer_name: newAppointment.customerName,
          customer_email: newAppointment.customerEmail || '',
          customer_phone: newAppointment.customerPhone,
          car_make: newAppointment.carMake,
          car_model: newAppointment.carModel,
          car_year: newAppointment.carYear,
          service_ids: newAppointment.serviceIds,
          appointment_date: dateStr,
          appointment_time: newAppointment.appointmentTime,
          notes: newAppointment.notes || null,
          confirmation_number: confData,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // Send email if requested and email provided
      if (newAppointment.sendEmail && newAppointment.customerEmail) {
        const selectedServiceNames = services
          .filter(s => newAppointment.serviceIds.includes(s.id))
          .map(s => s.name);

        await supabase.functions.invoke('send-appointment-email', {
          body: {
            to: newAppointment.customerEmail,
            customerName: newAppointment.customerName,
            confirmationNumber: confData,
            appointmentDate: newAppointment.appointmentDate.toLocaleDateString(),
            appointmentTime: newAppointment.appointmentTime,
            services: selectedServiceNames,
            carMake: newAppointment.carMake,
            carModel: newAppointment.carModel,
            carYear: newAppointment.carYear,
            action: 'booking',
            notes: newAppointment.notes
          }
        });
      }

      toast({
        title: "Appointment created",
        description: `Confirmation: ${confData}${newAppointment.sendEmail && newAppointment.customerEmail ? ' (email sent)' : ''}`,
      });

      // Reset form
      setNewAppointment({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        carMake: "",
        carModel: "",
        carYear: new Date().getFullYear(),
        serviceIds: [],
        appointmentDate: undefined,
        appointmentTime: "",
        notes: "",
        sendEmail: true
      });
      setAddAppointmentDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error creating appointment",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStaffNames = (staffIds: string[]) => {
    return staff
      .filter(s => staffIds.includes(s.id))
      .map(s => s.name)
      .join(', ');
  };

  const calculateCompletionTotals = () => {
    const servicesSubtotal = completionData.servicesPerformed
      .filter(s => s.service && s.cost)
      .reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0);
    
    const itemsSubtotal = completionData.itemsPurchased
      .filter(i => i.name && i.cost)
      .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0);

    const taxRate = parseFloat(completionData.taxRate) || 0;
    const taxes = servicesSubtotal * (taxRate / 100);
    const discount = parseFloat(completionData.discount) || 0;
    const total = servicesSubtotal + itemsSubtotal + taxes - discount;

    return {
      servicesSubtotal: servicesSubtotal.toFixed(2),
      itemsSubtotal: itemsSubtotal.toFixed(2),
      taxes: taxes.toFixed(2),
      total: total.toFixed(2)
    };
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

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(apt => apt.appointment_date === today);
  };

  const groupAppointmentsByDay = () => {
    const grouped: Record<string, Appointment[]> = {};
    appointments.forEach(apt => {
      // Use the date string directly to avoid timezone issues
      const date = apt.appointment_date;
      const [year, month, day] = date.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      const dateKey = dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    return grouped;
  };

  const renderAppointmentRow = (appointment: Appointment, showDate: boolean = true) => (
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
        {showDate && (
          <div>
            {appointment.appointment_date}
          </div>
        )}
        <div className="text-sm text-muted-foreground">
          {appointment.appointment_time}
        </div>
      </TableCell>
      <TableCell>{getServiceNames(appointment.service_ids)}</TableCell>
      <TableCell className="text-sm">
        {appointment.car_year} {appointment.car_make} {appointment.car_model}
      </TableCell>
      <TableCell className="text-sm max-w-[200px]">
        {appointment.notes ? (
          <div className="truncate" title={appointment.notes}>
            {appointment.notes}
          </div>
        ) : (
          <span className="text-muted-foreground italic">No notes</span>
        )}
      </TableCell>
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
              <DialogContent className="max-w-[95vw] md:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-lg">Edit Appointment</DialogTitle>
                  <DialogDescription className="text-sm">
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
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                  itemsPurchased: [],
                  selectedStaff: [],
                  staffHours: {},
                  taxRate: "14",
                  discount: "",
                  notes: "",
                  paymentMethod: "cash"
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
              <DialogContent className="max-h-[90vh] max-w-[95vw] md:max-w-[600px] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-lg">Complete Appointment</DialogTitle>
                  <DialogDescription className="text-sm">
                    Add service details and final payment (all fields optional)
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Services Performed</Label>
                    {completionData.servicesPerformed.map((service, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Service name"
                          value={service.service}
                          onChange={(e) => {
                            const updated = [...completionData.servicesPerformed];
                            updated[index].service = e.target.value;
                            setCompletionData({ ...completionData, servicesPerformed: updated });
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={service.cost}
                          onChange={(e) => {
                            const updated = [...completionData.servicesPerformed];
                            updated[index].cost = e.target.value;
                            setCompletionData({ ...completionData, servicesPerformed: updated });
                          }}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
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
                      <Plus className="h-4 w-4 mr-2" />
                      Add Service
                    </Button>
                  </div>

                  <div>
                    <Label>Items Purchased</Label>
                    {completionData.itemsPurchased.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => {
                            const updated = [...completionData.itemsPurchased];
                            updated[index].name = e.target.value;
                            setCompletionData({ ...completionData, itemsPurchased: updated });
                          }}
                        />
                        <Input
                          type="number"
                          placeholder="Cost"
                          value={item.cost}
                          onChange={(e) => {
                            const updated = [...completionData.itemsPurchased];
                            updated[index].cost = e.target.value;
                            setCompletionData({ ...completionData, itemsPurchased: updated });
                          }}
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            const updated = completionData.itemsPurchased.filter((_, i) => i !== index);
                            setCompletionData({ ...completionData, itemsPurchased: updated });
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
                          itemsPurchased: [...completionData.itemsPurchased, { name: "", cost: "" }]
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  <div>
                    <Label>Staff Members & Hours</Label>
                    <div className="space-y-2 border rounded-md p-3 max-h-60 overflow-y-auto">
                      {staff.filter(s => s.is_active).map((s) => (
                        <div key={s.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`staff-${s.id}`}
                            checked={completionData.selectedStaff.includes(s.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setCompletionData({
                                  ...completionData,
                                  selectedStaff: [...completionData.selectedStaff, s.id],
                                  staffHours: { ...completionData.staffHours, [s.id]: "" }
                                });
                              } else {
                                const newStaffHours = { ...completionData.staffHours };
                                delete newStaffHours[s.id];
                                setCompletionData({
                                  ...completionData,
                                  selectedStaff: completionData.selectedStaff.filter(id => id !== s.id),
                                  staffHours: newStaffHours
                                });
                              }
                            }}
                          />
                          <Label htmlFor={`staff-${s.id}`} className="cursor-pointer flex-1">
                            {s.name}
                          </Label>
                          {completionData.selectedStaff.includes(s.id) && (
                            <Input
                              type="number"
                              step="0.5"
                              placeholder="Hours"
                              className="w-24"
                              value={completionData.staffHours[s.id] || ""}
                              onChange={(e) => {
                                setCompletionData({
                                  ...completionData,
                                  staffHours: {
                                    ...completionData.staffHours,
                                    [s.id]: e.target.value
                                  }
                                });
                              }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        value={completionData.taxRate}
                        onChange={(e) => setCompletionData({ ...completionData, taxRate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Discount ($)</Label>
                      <Input
                        type="number"
                        value={completionData.discount}
                        onChange={(e) => setCompletionData({ ...completionData, discount: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Payment Method</Label>
                    <Select value={completionData.paymentMethod} onValueChange={(value) => setCompletionData({ ...completionData, paymentMethod: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="mastercard">Mastercard</SelectItem>
                        <SelectItem value="etransfer">E-Transfer</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Additional Notes</Label>
                    <Textarea
                      value={completionData.notes}
                      onChange={(e) => setCompletionData({ ...completionData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                    />
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Services Subtotal:</span>
                      <span className="font-medium">
                        ${completionData.servicesPerformed
                          .reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Items Subtotal:</span>
                      <span className="font-medium">
                        ${completionData.itemsPurchased
                          .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0)
                          .toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Taxes ({completionData.taxRate}%):</span>
                      <span className="font-medium">
                        ${(
                          completionData.servicesPerformed
                            .reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0) *
                          ((parseFloat(completionData.taxRate) || 0) / 100)
                        ).toFixed(2)}
                      </span>
                    </div>
                    {parseFloat(completionData.discount) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>Discount:</span>
                        <span className="font-medium">
                          -${parseFloat(completionData.discount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Total:</span>
                      <span>
                        ${(
                          completionData.servicesPerformed
                            .reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0) +
                          completionData.itemsPurchased
                            .reduce((sum, i) => sum + (parseFloat(i.cost) || 0), 0) +
                          (completionData.servicesPerformed
                            .reduce((sum, s) => sum + (parseFloat(s.cost) || 0), 0) *
                            ((parseFloat(completionData.taxRate) || 0) / 100)) -
                          (parseFloat(completionData.discount) || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleCompleteAppointment} 
                      className="flex-1"
                      disabled={actionLoading === completingAppointment?.id}
                    >
                      {actionLoading === completingAppointment?.id ? "Completing..." : "Complete & Send Invoice"}
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setCompletionDialogOpen(false);
                        setCompletingAppointment(null);
                        setCompletionData({
                          servicesPerformed: [],
                          itemsPurchased: [],
                          selectedStaff: [],
                          staffHours: {},
                          taxRate: "14",
                          discount: "",
                          notes: "",
                          paymentMethod: "cash"
                        });
                      }}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {appointment.status !== 'complete' && appointment.status !== 'in_progress' && (
            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading === appointment.id}
              onClick={() => handleCancel(appointment)}
              title="Cancel Appointment"
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
  );

  const groupCompletedServicesByMonth = (): GroupedCompletedServices => {
    const grouped: GroupedCompletedServices = {};
    completedServices.forEach(cs => {
      const date = new Date(cs.created_at);
      const key = `${date.toLocaleString('default', { month: 'long' })} ${date.getFullYear()}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(cs);
    });
    return grouped;
  };

  const groupCompletedServicesByStaff = (): GroupedCompletedServices => {
    const grouped: GroupedCompletedServices = {};
    completedServices.forEach(cs => {
      const staffNames = getStaffNames(cs.staff_ids) || 'Unassigned';
      if (!grouped[staffNames]) {
        grouped[staffNames] = [];
      }
      grouped[staffNames].push(cs);
    });
    return grouped;
  };

  const getGroupedServices = (): GroupedCompletedServices => {
    return groupBy === "month" ? groupCompletedServicesByMonth() : groupCompletedServicesByStaff();
  };

  const exportAppointmentsToCSV = () => {
    const headers = [
      "Confirmation #", "Customer Name", "Email", "Phone",
      "Date", "Time", "Services", "Car Make", "Car Model", "Car Year",
      "Status", "Notes", "Created At"
    ];
    
    const rows = appointments.map(apt => {
      const serviceNames = getServiceNames(apt.service_ids);
      
      return [
        apt.confirmation_number || '',
        apt.customer_name || '',
        apt.customer_email || '',
        apt.customer_phone || '',
        new Date(apt.appointment_date).toLocaleDateString(),
        apt.appointment_time || '',
        serviceNames || '',
        apt.car_make || '',
        apt.car_model || '',
        apt.car_year?.toString() || '',
        apt.status || '',
        apt.notes || '',
        new Date(apt.created_at).toLocaleDateString()
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
    a.download = `appointments-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "Appointments CSV file downloaded",
    });
  };

  const exportStaffHours = (staffId: string) => {
    const selectedStaff = staff.find(s => s.id === staffId);
    if (!selectedStaff) return;

    // Filter completed services for this staff member
    const staffServices = completedServices.filter(cs => 
      cs.staff_ids && cs.staff_ids.includes(staffId)
    );

    if (staffServices.length === 0) {
      toast({
        title: "No data",
        description: `No completed services found for ${selectedStaff.name}`,
        variant: "destructive",
      });
      setStaffExportDialogOpen(false);
      return;
    }

    const headers = ["Date", "Confirmation #", "Customer", "Car Make", "Car Model", "Car Year", "Services", "Service Costs", "Items", "Item Costs", "Hours Worked", "Notes"];
    
    const rows = staffServices.map(cs => {
      const servicesStr = cs.services_performed.map((s: any) => s.service).join("; ");
      const serviceCostsStr = cs.services_performed.map((s: any) => `$${s.cost.toFixed(2)}`).join("; ");
      const itemsStr = Array.isArray(cs.items_purchased) 
        ? cs.items_purchased.map((i: any) => i.name).join("; ")
        : "";
      const itemCostsStr = Array.isArray(cs.items_purchased)
        ? cs.items_purchased.map((i: any) => `$${i.cost.toFixed(2)}`).join("; ")
        : "";
      
      // Get hours for this specific staff member
      const staffHours = cs.staff_hours?.[staffId] || 0;
      
      return [
        cs.appointment_date ? new Date(cs.appointment_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString(),
        cs.confirmation_number || "N/A",
        cs.customer_name || "N/A",
        cs.car_make || "N/A",
        cs.car_model || "N/A",
        cs.car_year || "N/A",
        servicesStr || "N/A",
        serviceCostsStr || "N/A",
        itemsStr || "N/A",
        itemCostsStr || "N/A",
        staffHours.toString(),
        cs.notes || ""
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedStaff.name.replace(/\s+/g, '_')}_hours_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setStaffExportDialogOpen(false);
    
    toast({
      title: "Export successful",
      description: `Staff hours for ${selectedStaff.name} downloaded`,
    });
  };

  const exportToCSV = () => {
    // Get unique staff members from all completed services
    const allStaffIds = new Set<string>();
    completedServices.forEach(cs => {
      (cs.staff_ids || []).forEach(id => allStaffIds.add(id));
    });
    
    // Create headers with individual staff columns
    const staffColumns: string[] = [];
    allStaffIds.forEach(staffId => {
      const staffMember = staff.find(s => s.id === staffId);
      if (staffMember) {
        staffColumns.push(`${staffMember.name} Hours`);
      }
    });
    
    const headers = [
      "Date", "Confirmation #", "Customer", "Car Make", "Car Model", "Car Year",
      "Services", "Service Costs", "Items", "Item Costs", 
      ...staffColumns, "Total Hours", "Subtotal", "Taxes", "Total", "Payment Method", "Notes"
    ];
    
    const rows = completedServices.map(cs => {
      const services = cs.services_performed.map((s: any) => s.service).join('; ');
      const serviceCosts = cs.services_performed.map((s: any) => `$${s.cost}`).join('; ');
      
      const items = Array.isArray(cs.items_purchased) 
        ? cs.items_purchased.map((i: any) => i.name).join('; ')
        : '';
      const itemCosts = Array.isArray(cs.items_purchased)
        ? cs.items_purchased.map((i: any) => `$${i.cost}`).join('; ')
        : '';
      
      // Create staff hours columns
      const staffHoursColumns: string[] = [];
      allStaffIds.forEach(staffId => {
        const hours = cs.staff_hours?.[staffId] || 0;
        staffHoursColumns.push(hours.toString());
      });
      
      return [
        cs.appointment_date ? new Date(cs.appointment_date).toLocaleDateString() : (cs.created_at ? new Date(cs.created_at).toLocaleDateString() : ''),
        cs.confirmation_number || '',
        cs.customer_name || '',
        cs.car_make || '',
        cs.car_model || '',
        cs.car_year?.toString() || '',
        services,
        serviceCosts,
        items,
        itemCosts,
        ...staffHoursColumns,
        cs.hours_worked?.toString() || '0',
        `$${cs.subtotal?.toFixed(2) || '0.00'}`,
        `$${cs.taxes?.toFixed(2) || '0.00'}`,
        `$${cs.total_cost?.toFixed(2) || '0.00'}`,
        cs.payment_method || '',
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
      
      <section className="py-6 md:py-20">
        <div className="container px-4">
          <div className="flex justify-between items-center mb-6 md:mb-8">
            <h1 className="text-2xl md:text-4xl font-bold">Admin Dashboard</h1>
            <Button variant="outline" onClick={handleLogout} size="sm">
              <LogOut className="mr-0 md:mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>

          <Tabs defaultValue="appointments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto gap-2 p-1">
              <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card className="shadow-strong">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-4">
                    <CardTitle className="text-lg md:text-xl">All Appointments</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={appointmentView === "today" ? "default" : "outline"}
                        onClick={() => setAppointmentView("today")}
                      >
                        Today
                      </Button>
                      <Button
                        size="sm"
                        variant={appointmentView === "all" ? "default" : "outline"}
                        onClick={() => setAppointmentView("all")}
                      >
                        All
                      </Button>
                      <Button
                        size="sm"
                        variant={appointmentView === "by-day" ? "default" : "outline"}
                        onClick={() => setAppointmentView("by-day")}
                      >
                        By Day
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={exportAppointmentsToCSV} disabled={appointments.length === 0} size="sm" variant="outline">
                      <Download className="mr-0 sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                    <Dialog open={addAppointmentDialogOpen} onOpenChange={setAddAppointmentDialogOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-0 sm:mr-2" />
                          <span className="hidden sm:inline">Add Appointment</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </DialogTrigger>
                    <DialogContent className="max-w-[95vw] md:max-w-[600px] max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Create New Appointment</DialogTitle>
                        <DialogDescription>
                          Add a walk-in or phone appointment manually
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="customerName">Customer Name *</Label>
                          <Input
                            id="customerName"
                            value={newAppointment.customerName}
                            onChange={(e) => setNewAppointment({ ...newAppointment, customerName: e.target.value })}
                            placeholder="John Doe"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerPhone">Phone Number *</Label>
                          <Input
                            id="customerPhone"
                            value={newAppointment.customerPhone}
                            onChange={(e) => setNewAppointment({ ...newAppointment, customerPhone: e.target.value })}
                            placeholder="(555) 123-4567"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="customerEmail">Email (Optional)</Label>
                          <Input
                            id="customerEmail"
                            type="email"
                            value={newAppointment.customerEmail}
                            onChange={(e) => setNewAppointment({ ...newAppointment, customerEmail: e.target.value })}
                            placeholder="john@example.com"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="space-y-2">
                            <Label htmlFor="carYear">Year</Label>
                            <Input
                              id="carYear"
                              type="number"
                              value={newAppointment.carYear}
                              onChange={(e) => setNewAppointment({ ...newAppointment, carYear: parseInt(e.target.value) || new Date().getFullYear() })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="carMake">Make</Label>
                            <Input
                              id="carMake"
                              value={newAppointment.carMake}
                              onChange={(e) => setNewAppointment({ ...newAppointment, carMake: e.target.value })}
                              placeholder="Toyota"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="carModel">Model</Label>
                            <Input
                              id="carModel"
                              value={newAppointment.carModel}
                              onChange={(e) => setNewAppointment({ ...newAppointment, carModel: e.target.value })}
                              placeholder="Camry"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Services *</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                            {services.map(service => (
                              <div key={service.id} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`service-${service.id}`}
                                  checked={newAppointment.serviceIds.includes(service.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNewAppointment({
                                        ...newAppointment,
                                        serviceIds: [...newAppointment.serviceIds, service.id]
                                      });
                                    } else {
                                      setNewAppointment({
                                        ...newAppointment,
                                        serviceIds: newAppointment.serviceIds.filter(id => id !== service.id)
                                      });
                                    }
                                  }}
                                />
                                <label htmlFor={`service-${service.id}`} className="text-sm cursor-pointer">
                                  {service.name} ({service.duration_minutes} min)
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Appointment Date *</Label>
                          <Calendar
                            mode="single"
                            selected={newAppointment.appointmentDate}
                            onSelect={(date) => setNewAppointment({ ...newAppointment, appointmentDate: date })}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            className="rounded-md border"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="appointmentTime">Time Slot *</Label>
                          <Select
                            value={newAppointment.appointmentTime}
                            onValueChange={(value) => setNewAppointment({ ...newAppointment, appointmentTime: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select time" />
                            </SelectTrigger>
                            <SelectContent>
                              {timeSlots.map(time => (
                                <SelectItem key={time} value={time}>{time}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newAppointment.notes}
                            onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
                            placeholder="Additional notes..."
                            rows={3}
                          />
                        </div>
                        {newAppointment.customerEmail && (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="sendEmail"
                              checked={newAppointment.sendEmail}
                              onCheckedChange={(checked) => setNewAppointment({ ...newAppointment, sendEmail: !!checked })}
                            />
                            <label htmlFor="sendEmail" className="text-sm cursor-pointer">
                              Send confirmation email
                            </label>
                          </div>
                        )}
                        <Button 
                          onClick={handleAddAppointment} 
                          className="w-full" 
                          disabled={actionLoading === "add-appointment"}
                        >
                          {actionLoading === "add-appointment" ? "Creating..." : "Create Appointment"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  </div>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
              {loading ? (
                <p>Loading appointments...</p>
              ) : appointments.length === 0 ? (
                <p className="text-muted-foreground">No appointments found</p>
              ) : appointmentView === "today" ? (
                // Today's appointments view
                (() => {
                  const todaysAppointments = getTodaysAppointments();
                  return todaysAppointments.length === 0 ? (
                    <p className="text-muted-foreground">No appointments scheduled for today</p>
                  ) : (
                    <div className="overflow-x-auto -mx-2 md:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="min-w-[120px]">Confirmation #</TableHead>
                                <TableHead className="min-w-[120px]">Customer</TableHead>
                                <TableHead className="min-w-[150px]">Contact</TableHead>
                                <TableHead className="min-w-[120px]">Time</TableHead>
                                <TableHead className="min-w-[150px]">Services</TableHead>
                                <TableHead className="min-w-[150px]">Car Info</TableHead>
                                <TableHead className="min-w-[200px]">Notes</TableHead>
                                <TableHead className="min-w-[100px]">Status</TableHead>
                                <TableHead className="min-w-[180px]">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {todaysAppointments.map((appointment) => renderAppointmentRow(appointment, false))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : appointmentView === "by-day" ? (
                // Grouped by day view
                <div className="space-y-6">
                  {Object.entries(groupAppointmentsByDay()).map(([date, dayAppointments]) => (
                    <div key={date} className="space-y-3">
                      <h3 className="text-lg font-semibold sticky top-0 bg-background py-2 border-b">
                        {date} ({dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''})
                      </h3>
                      <div className="overflow-x-auto -mx-2 md:mx-0">
                        <div className="inline-block min-w-full align-middle">
                          <div className="overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[120px]">Confirmation #</TableHead>
                                  <TableHead className="min-w-[120px]">Customer</TableHead>
                                  <TableHead className="min-w-[150px]">Contact</TableHead>
                                  <TableHead className="min-w-[120px]">Time</TableHead>
                                  <TableHead className="min-w-[150px]">Services</TableHead>
                                  <TableHead className="min-w-[150px]">Car Info</TableHead>
                                  <TableHead className="min-w-[200px]">Notes</TableHead>
                                  <TableHead className="min-w-[100px]">Status</TableHead>
                                  <TableHead className="min-w-[180px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {dayAppointments.map((appointment) => renderAppointmentRow(appointment, false))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // All appointments view
                <div className="overflow-x-auto -mx-2 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">Confirmation #</TableHead>
                            <TableHead className="min-w-[120px]">Customer</TableHead>
                            <TableHead className="min-w-[150px]">Contact</TableHead>
                            <TableHead className="min-w-[120px]">Date & Time</TableHead>
                            <TableHead className="min-w-[150px]">Services</TableHead>
                            <TableHead className="min-w-[150px]">Car Info</TableHead>
                            <TableHead className="min-w-[200px]">Notes</TableHead>
                            <TableHead className="min-w-[100px]">Status</TableHead>
                            <TableHead className="min-w-[180px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments.map((appointment) => renderAppointmentRow(appointment, true))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

         <TabsContent value="completed">
          <Card className="shadow-strong">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="flex flex-col gap-2 w-full sm:w-auto">
                <CardTitle className="text-lg md:text-xl">Completed Services</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant={groupBy === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupBy("month")}
                  >
                    By Month
                  </Button>
                  <Button
                    variant={groupBy === "staff" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setGroupBy("staff")}
                  >
                    By Staff
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog open={staffExportDialogOpen} onOpenChange={setStaffExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" disabled={completedServices.length === 0}>
                      <Download className="mr-0 sm:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export Staff Hours</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Export Staff Hours</DialogTitle>
                      <DialogDescription>Select a staff member to export their hours</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Staff</Label>
                        <Select onValueChange={exportStaffHours}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose staff member" />
                          </SelectTrigger>
                          <SelectContent>
                            {staff.filter(s => s.is_active).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={exportToCSV} disabled={completedServices.length === 0} size="sm">
                  <Download className="mr-0 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Export All</span>
                  <span className="sm:hidden">Export</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {loading ? (
                <p>Loading completed services...</p>
              ) : completedServices.length === 0 ? (
                <p className="text-muted-foreground">No completed services found</p>
              ) : (
                <div className="space-y-6">
                  {Object.entries(getGroupedServices())
                    .sort((a, b) => new Date(b[1][0].created_at).getTime() - new Date(a[1][0].created_at).getTime())
                    .map(([groupKey, services]) => (
                    <div key={groupKey} className="space-y-3">
                      <h3 className="text-lg font-semibold text-foreground border-b pb-2">{groupKey}</h3>
                      <div className="overflow-x-auto -mx-2 md:mx-0">
                        <div className="inline-block min-w-full align-middle">
                          <div className="overflow-hidden">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="min-w-[100px]">Date</TableHead>
                                  <TableHead className="min-w-[120px]">Confirmation #</TableHead>
                                  <TableHead className="min-w-[120px]">Customer</TableHead>
                                  <TableHead className="min-w-[150px]">Car</TableHead>
                                  <TableHead className="min-w-[150px]">Services</TableHead>
                                  <TableHead className="min-w-[120px]">Items</TableHead>
                                  <TableHead className="min-w-[100px]">Staff</TableHead>
                                  <TableHead className="min-w-[80px]">Hours</TableHead>
                                  <TableHead className="min-w-[100px]">Payment</TableHead>
                                  <TableHead className="min-w-[100px]">Total</TableHead>
                                  <TableHead className="min-w-[150px]">Notes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {services.map((cs) => {
                                  return (
                                    <TableRow key={cs.id}>
                                      <TableCell>
                                        {cs.appointment_date ? new Date(cs.appointment_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell className="font-mono text-xs">
                                        {cs.confirmation_number || 'N/A'}
                                      </TableCell>
                                      <TableCell>{cs.customer_name || 'N/A'}</TableCell>
                                      <TableCell className="text-sm">
                                        {cs.car_year && cs.car_make && cs.car_model ? `${cs.car_year} ${cs.car_make} ${cs.car_model}` : 'N/A'}
                                      </TableCell>
                                      <TableCell>
                                        {cs.services_performed.map((s: any) => (
                                          <div key={s.service} className="text-sm">
                                            {s.service}: ${s.cost.toFixed(2)}
                                          </div>
                                        ))}
                                      </TableCell>
                                      <TableCell>
                                        {cs.items_purchased.map((i: any) => (
                                          <div key={i.name} className="text-sm">
                                            {i.name}: ${i.cost.toFixed(2)}
                                          </div>
                                        ))}
                                      </TableCell>
                                      <TableCell>{getStaffNames(cs.staff_ids)}</TableCell>
                                      <TableCell>{cs.hours_worked}</TableCell>
                                      <TableCell className="capitalize">{cs.payment_method}</TableCell>
                                      <TableCell className="font-semibold">
                                        ${cs.total_cost.toFixed(2)}
                                      </TableCell>
                                      <TableCell className="text-sm">{cs.notes || '-'}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff">
          <Card className="shadow-strong">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <CardTitle className="text-lg md:text-xl">Staff Management</CardTitle>
              <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingStaff(null);
                    setNewStaff({ name: "", email: "", phone: "" });
                  }} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Staff</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg">{editingStaff ? "Edit Staff" : "Add New Staff"}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Name</Label>
                      <Input
                        value={newStaff.name}
                        onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                        placeholder="Staff name"
                      />
                    </div>
                    <div>
                      <Label>Email (Optional)</Label>
                      <Input
                        type="email"
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label>Phone (Optional)</Label>
                      <Input
                        type="tel"
                        value={newStaff.phone}
                        onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                        placeholder="(123) 456-7890"
                      />
                    </div>
                    <Button onClick={handleSaveStaff} className="w-full" disabled={actionLoading === "staff"}>
                      {actionLoading === "staff" ? "Saving..." : (editingStaff ? "Update Staff" : "Add Staff")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {loading ? (
                <p>Loading staff...</p>
              ) : staff.length === 0 ? (
                <p className="text-muted-foreground">No staff found</p>
              ) : (
                <div className="overflow-x-auto -mx-2 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[120px]">Name</TableHead>
                            <TableHead className="min-w-[150px]">Email</TableHead>
                            <TableHead className="min-w-[120px]">Phone</TableHead>
                            <TableHead className="min-w-[80px]">Status</TableHead>
                            <TableHead className="min-w-[120px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                    <TableBody>
                      {staff.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>{s.email || '-'}</TableCell>
                          <TableCell>{s.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={actionLoading === s.id}
                                onClick={() => {
                                  setEditingStaff(s);
                                  setNewStaff({
                                    name: s.name,
                                    email: s.email || "",
                                    phone: s.phone || ""
                                  });
                                  setStaffDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {s.is_active && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  disabled={actionLoading === s.id}
                                  onClick={() => handleDeleteStaff(s.id)}
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
                </div>
              </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="shadow-strong">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
              <CardTitle className="text-lg md:text-xl">Services Management</CardTitle>
              <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingService(null);
                    setNewService({ name: "", description: "", price_range: "", duration_minutes: 60 });
                  }} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Service</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] md:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle className="text-lg">{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
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
            <CardContent className="px-2 md:px-6">
              {loading ? (
                <p>Loading services...</p>
              ) : services.length === 0 ? (
                <p className="text-muted-foreground">No services found</p>
              ) : (
                <div className="overflow-x-auto -mx-2 md:mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <div className="overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Name</TableHead>
                            <TableHead className="min-w-[200px]">Description</TableHead>
                            <TableHead className="min-w-[100px]">Price Range</TableHead>
                            <TableHead className="min-w-[100px]">Duration</TableHead>
                            <TableHead className="min-w-[120px]">Actions</TableHead>
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
                </div>
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