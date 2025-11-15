import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Download, Search, Plus, Edit, Trash2 } from "lucide-react";

// Validation schemas
const appointmentSchema = z.object({
  appointment_date: z.string().min(1, "Date is required"),
  appointment_time: z.string().min(1, "Time is required"),
  customer_name: z.string().min(1, "Name is required"),
  customer_phone: z.string().min(1, "Phone is required"),
  customer_email: z.string().email("Invalid email"),
  car_year: z.coerce.number().min(1900, "Invalid year"),
  car_make: z.string().min(1, "Make is required"),
  car_model: z.string().min(1, "Model is required"),
  notes: z.string().optional(),
  status: z.enum(["pending", "in_progress", "complete", "cancelled"]),
});

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  price_range: z.string().min(1, "Price range is required"),
  duration_minutes: z.coerce.number().min(1, "Duration must be at least 1 minute"),
});

const staffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
});

const paycheckSchema = z.object({
  staff_id: z.string().min(1, "Staff member is required"),
  period_start: z.string().min(1, "Start date is required"),
  period_end: z.string().min(1, "End date is required"),
  total_hours: z.coerce.number().min(0, "Hours must be positive"),
  hourly_rate: z.coerce.number().min(0, "Rate must be positive"),
  notes: z.string().optional(),
});

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [completedServices, setCompletedServices] = useState<any[]>([]);
  const [paychecks, setPaychecks] = useState<any[]>([]);
  
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [completedServiceSearch, setCompletedServiceSearch] = useState("");
  const [paycheckSearch, setPaycheckSearch] = useState("");
  
  const [serviceDialogOpen, setServiceDialogOpen] = useState(false);
  const [staffDialogOpen, setStaffDialogOpen] = useState(false);
  const [paycheckDialogOpen, setPaycheckDialogOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: string, id: string} | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const appointmentForm = useForm({
    resolver: zodResolver(appointmentSchema),
    defaultValues: { 
      appointment_date: "", 
      appointment_time: "", 
      customer_name: "", 
      customer_phone: "", 
      customer_email: "",
      car_year: new Date().getFullYear(),
      car_make: "",
      car_model: "",
      notes: "",
      status: "pending" as const
    }
  });
  
  const serviceForm = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: { name: "", description: "", price_range: "", duration_minutes: 30 }
  });
  
  const staffForm = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", phone: "" }
  });
  
  const paycheckForm = useForm({
    resolver: zodResolver(paycheckSchema),
    defaultValues: { staff_id: "", period_start: "", period_end: "", total_hours: 0, hourly_rate: 0, notes: "" }
  });

  useEffect(() => {
    document.title = "Admin Dashboard | Rogova Auto Shop";
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appointmentsRes, servicesRes, staffRes, completedRes, paychecksRes] = await Promise.all([
        supabase.from("appointments").select("*").order("appointment_date", { ascending: false }),
        supabase.from("services").select("*").order("name"),
        supabase.from("staff").select("*").order("name"),
        supabase.from("completed_services").select("*").order("created_at", { ascending: false }),
        supabase.from("staff_paychecks").select("*").order("created_at", { ascending: false })
      ]);

      if (appointmentsRes.data) setAppointments(appointmentsRes.data);
      if (servicesRes.data) setServices(servicesRes.data);
      if (staffRes.data) setStaff(staffRes.data);
      if (completedRes.data) setCompletedServices(completedRes.data);
      if (paychecksRes.data) setPaychecks(paychecksRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    navigate("/admin-login");
    toast({ title: "Logged out" });
  };

  // Appointment CRUD
  const onAppointmentSubmit = async (data: z.infer<typeof appointmentSchema>) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("appointments")
          .update(data as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Appointment updated successfully" });
      }
      setAppointmentDialogOpen(false);
      setEditingItem(null);
      appointmentForm.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateAppointmentStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("appointments")
        .update({ status } as any)
        .eq("id", id);
      if (error) throw error;
      toast({ title: "Status updated successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Service CRUD
  const onServiceSubmit = async (data: z.infer<typeof serviceSchema>) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("services")
          .update(data as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Service updated successfully" });
      } else {
        const { error } = await supabase.from("services").insert(data as any);
        if (error) throw error;
        toast({ title: "Service created successfully" });
      }
      setServiceDialogOpen(false);
      setEditingItem(null);
      serviceForm.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Staff CRUD
  const onStaffSubmit = async (data: z.infer<typeof staffSchema>) => {
    try {
      if (editingItem) {
        const { error } = await supabase
          .from("staff")
          .update(data as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Staff updated successfully" });
      } else {
        const { error } = await supabase.from("staff").insert(data as any);
        if (error) throw error;
        toast({ title: "Staff created successfully" });
      }
      setStaffDialogOpen(false);
      setEditingItem(null);
      staffForm.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Paycheck CRUD
  const onPaycheckSubmit = async (data: z.infer<typeof paycheckSchema>) => {
    try {
      const selectedStaff = staff.find(s => s.id === data.staff_id);
      const total_amount = data.total_hours * data.hourly_rate;
      
      const paycheckData = {
        ...data,
        staff_name: selectedStaff?.name || "",
        staff_email: selectedStaff?.email,
        total_amount,
        status: "unpaid"
      };

      if (editingItem) {
        const { error } = await supabase
          .from("staff_paychecks")
          .update(paycheckData as any)
          .eq("id", editingItem.id);
        if (error) throw error;
        toast({ title: "Paycheck updated successfully" });
      } else {
        const { error } = await supabase.from("staff_paychecks").insert(paycheckData as any);
        if (error) throw error;
        toast({ title: "Paycheck created successfully" });
      }
      setPaycheckDialogOpen(false);
      setEditingItem(null);
      paycheckForm.reset();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      const tableMap: Record<string, string> = {
        appointment: "appointments",
        service: "services",
        staff: "staff",
        paycheck: "staff_paychecks",
        completed: "completed_services"
      };
      
      const tableName = tableMap[itemToDelete.type];
      if (!tableName) throw new Error("Invalid item type");
      
      const { error } = await supabase
        .from(tableName as any)
        .delete()
        .eq("id", itemToDelete.id);
        
      if (error) throw error;
      toast({ title: `${itemToDelete.type} deleted successfully` });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditDialog = (type: string, item: any) => {
    setEditingItem(item);
    if (type === "appointment") {
      appointmentForm.reset({
        appointment_date: item.appointment_date,
        appointment_time: item.appointment_time,
        customer_name: item.customer_name,
        customer_phone: item.customer_phone,
        customer_email: item.customer_email,
        car_year: item.car_year,
        car_make: item.car_make,
        car_model: item.car_model,
        notes: item.notes || "",
        status: item.status
      });
      setAppointmentDialogOpen(true);
    } else if (type === "service") {
      serviceForm.reset(item);
      setServiceDialogOpen(true);
    } else if (type === "staff") {
      staffForm.reset(item);
      setStaffDialogOpen(true);
    } else if (type === "paycheck") {
      paycheckForm.reset({
        staff_id: item.staff_id,
        period_start: item.period_start,
        period_end: item.period_end,
        total_hours: item.total_hours,
        hourly_rate: item.hourly_rate,
        notes: item.notes || ""
      });
      setPaycheckDialogOpen(true);
    }
  };

  const openDeleteDialog = (type: string, id: string) => {
    setItemToDelete({ type, id });
    setDeleteDialogOpen(true);
  };

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row => Object.values(row).map(v => `"${v}"`).join(","));
    const csv = [headers, ...rows].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast({ title: "Export successful", description: "CSV file downloaded" });
  };

  const filteredAppointments = appointments.filter(apt =>
    appointmentSearch === "" ||
    apt.customer_name?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
    apt.customer_phone?.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
    apt.confirmation_number?.toLowerCase().includes(appointmentSearch.toLowerCase())
  );

  const filteredCompleted = completedServices.filter(cs =>
    completedServiceSearch === "" ||
    cs.customer_name?.toLowerCase().includes(completedServiceSearch.toLowerCase()) ||
    cs.confirmation_number?.toLowerCase().includes(completedServiceSearch.toLowerCase())
  );

  const filteredPaychecks = paychecks.filter(p =>
    paycheckSearch === "" ||
    p.staff_name?.toLowerCase().includes(paycheckSearch.toLowerCase())
  );

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
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2 p-1">
              <TabsTrigger value="appointments" className="text-xs sm:text-sm">Appointments</TabsTrigger>
              <TabsTrigger value="services" className="text-xs sm:text-sm">Services</TabsTrigger>
              <TabsTrigger value="staff" className="text-xs sm:text-sm">Staff</TabsTrigger>
              <TabsTrigger value="completed" className="text-xs sm:text-sm">Completed</TabsTrigger>
              <TabsTrigger value="paychecks" className="text-xs sm:text-sm">Paychecks</TabsTrigger>
            </TabsList>

            <TabsContent value="appointments">
              <Card className="shadow-strong">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-4 w-full">
                    <CardTitle className="text-lg md:text-xl">Appointments</CardTitle>
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search appointments..."
                          value={appointmentSearch}
                          onChange={(e) => setAppointmentSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button onClick={() => exportToCSV(filteredAppointments, "appointments")} size="sm" disabled={filteredAppointments.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  {loading ? (
                    <p>Loading appointments...</p>
                  ) : filteredAppointments.length === 0 ? (
                    <p className="text-muted-foreground">No appointments found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((apt) => (
                            <TableRow key={apt.id}>
                              <TableCell>{new Date(apt.appointment_date).toLocaleDateString()}</TableCell>
                              <TableCell>{apt.appointment_time}</TableCell>
                              <TableCell className="font-medium">{apt.customer_name}</TableCell>
                              <TableCell>{apt.customer_phone}</TableCell>
                              <TableCell>
                                <Select value={apt.status} onValueChange={(value) => updateAppointmentStatus(apt.id, value)}>
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="in_progress">In Progress</SelectItem>
                                    <SelectItem value="complete">Complete</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog("appointment", apt)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog("appointment", apt.id)}>
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

            <TabsContent value="services">
              <Card className="shadow-strong">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <CardTitle className="text-lg md:text-xl">Services</CardTitle>
                  <Button onClick={() => { setEditingItem(null); serviceForm.reset(); setServiceDialogOpen(true); }} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Service
                  </Button>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
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
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog("service", service)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog("service", service.id)}>
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

            <TabsContent value="staff">
              <Card className="shadow-strong">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <CardTitle className="text-lg md:text-xl">Staff</CardTitle>
                  <Button onClick={() => { setEditingItem(null); staffForm.reset(); setStaffDialogOpen(true); }} size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Staff
                  </Button>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  {loading ? (
                    <p>Loading staff...</p>
                  ) : staff.length === 0 ? (
                    <p className="text-muted-foreground">No staff found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {staff.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.name}</TableCell>
                              <TableCell>{s.email || 'N/A'}</TableCell>
                              <TableCell>{s.phone || 'N/A'}</TableCell>
                              <TableCell>
                                <Badge variant={s.is_active ? 'default' : 'secondary'}>
                                  {s.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog("staff", s)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog("staff", s.id)}>
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
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-4 w-full">
                    <CardTitle className="text-lg md:text-xl">Completed Services</CardTitle>
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search completed services..."
                          value={completedServiceSearch}
                          onChange={(e) => setCompletedServiceSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button onClick={() => exportToCSV(filteredCompleted, "completed-services")} size="sm" disabled={filteredCompleted.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  {loading ? (
                    <p>Loading completed services...</p>
                  ) : filteredCompleted.length === 0 ? (
                    <p className="text-muted-foreground">No completed services found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Vehicle</TableHead>
                            <TableHead>Confirmation</TableHead>
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Payment Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredCompleted.map((cs) => (
                            <TableRow key={cs.id}>
                              <TableCell>
                                {cs.appointment_date ? new Date(cs.appointment_date).toLocaleDateString() : new Date(cs.created_at).toLocaleDateString()}
                              </TableCell>
                              <TableCell className="font-medium">{cs.customer_name || 'N/A'}</TableCell>
                              <TableCell>{cs.car_year} {cs.car_make} {cs.car_model}</TableCell>
                              <TableCell className="text-sm">{cs.confirmation_number || 'N/A'}</TableCell>
                              <TableCell className="font-semibold">${cs.total_cost?.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={cs.payment_status === 'paid' ? 'default' : cs.payment_status === 'partial paid' ? 'secondary' : 'destructive'}>
                                  {cs.payment_status || 'unpaid'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button size="sm" variant="destructive" onClick={() => openDeleteDialog("completed", cs.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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

            <TabsContent value="paychecks">
              <Card className="shadow-strong">
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center gap-4 w-full">
                    <CardTitle className="text-lg md:text-xl">Staff Paychecks</CardTitle>
                    <div className="flex-1 max-w-md">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search by staff name..."
                          value={paycheckSearch}
                          onChange={(e) => setPaycheckSearch(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <Button onClick={() => { setEditingItem(null); paycheckForm.reset(); setPaycheckDialogOpen(true); }} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Add</span>
                    </Button>
                    <Button onClick={() => exportToCSV(filteredPaychecks, "paychecks")} size="sm" disabled={filteredPaychecks.length === 0}>
                      <Download className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="px-2 md:px-6">
                  {loading ? (
                    <p>Loading paychecks...</p>
                  ) : filteredPaychecks.length === 0 ? (
                    <p className="text-muted-foreground">No paychecks found</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Staff</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Hours</TableHead>
                            <TableHead>Rate</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPaychecks.map((paycheck) => (
                            <TableRow key={paycheck.id}>
                              <TableCell className="font-medium">{paycheck.staff_name}</TableCell>
                              <TableCell className="text-sm">
                                {new Date(paycheck.period_start).toLocaleDateString()} - {new Date(paycheck.period_end).toLocaleDateString()}
                              </TableCell>
                              <TableCell>{paycheck.total_hours}h</TableCell>
                              <TableCell>${paycheck.hourly_rate.toFixed(2)}/h</TableCell>
                              <TableCell className="font-semibold">${paycheck.total_amount.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={paycheck.status === 'paid' ? 'default' : 'secondary'}>
                                  {paycheck.status?.toUpperCase()}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" onClick={() => openEditDialog("paycheck", paycheck)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="destructive" onClick={() => openDeleteDialog("paycheck", paycheck.id)}>
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

      {/* Appointment Edit Dialog */}
      <Dialog open={appointmentDialogOpen} onOpenChange={setAppointmentDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
          </DialogHeader>
          <Form {...appointmentForm}>
            <form onSubmit={appointmentForm.handleSubmit(onAppointmentSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={appointmentForm.control} name="appointment_date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={appointmentForm.control} name="appointment_time" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time</FormLabel>
                    <FormControl><Input type="time" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={appointmentForm.control} name="customer_name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={appointmentForm.control} name="customer_phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={appointmentForm.control} name="customer_email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input type="email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField control={appointmentForm.control} name="car_year" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={appointmentForm.control} name="car_make" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Make</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={appointmentForm.control} name="car_model" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={appointmentForm.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={appointmentForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">Update Appointment</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Service Dialog */}
      <Dialog open={serviceDialogOpen} onOpenChange={setServiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Service" : "Add Service"}</DialogTitle>
          </DialogHeader>
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
              <FormField control={serviceForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={serviceForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={serviceForm.control} name="price_range" render={({ field }) => (
                <FormItem>
                  <FormLabel>Price Range</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g., $50-$100" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={serviceForm.control} name="duration_minutes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Staff Dialog */}
      <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Staff" : "Add Staff"}</DialogTitle>
          </DialogHeader>
          <Form {...staffForm}>
            <form onSubmit={staffForm.handleSubmit(onStaffSubmit)} className="space-y-4">
              <FormField control={staffForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={staffForm.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl><Input type="email" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={staffForm.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Paycheck Dialog */}
      <Dialog open={paycheckDialogOpen} onOpenChange={setPaycheckDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Paycheck" : "Add Paycheck"}</DialogTitle>
          </DialogHeader>
          <Form {...paycheckForm}>
            <form onSubmit={paycheckForm.handleSubmit(onPaycheckSubmit)} className="space-y-4">
              <FormField control={paycheckForm.control} name="staff_id" render={({ field }) => (
                <FormItem>
                  <FormLabel>Staff Member</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staff.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paycheckForm.control} name="period_start" render={({ field }) => (
                <FormItem>
                  <FormLabel>Period Start</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paycheckForm.control} name="period_end" render={({ field }) => (
                <FormItem>
                  <FormLabel>Period End</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paycheckForm.control} name="total_hours" render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Hours</FormLabel>
                  <FormControl><Input type="number" step="0.5" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paycheckForm.control} name="hourly_rate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate ($)</FormLabel>
                  <FormControl><Input type="number" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={paycheckForm.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <DialogFooter>
                <Button type="submit">{editingItem ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this {itemToDelete?.type}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
