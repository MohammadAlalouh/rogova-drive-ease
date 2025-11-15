import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Download, Search } from "lucide-react";

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
  
  const navigate = useNavigate();
  const { toast } = useToast();

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
                                <Badge variant={apt.status === 'complete' ? 'default' : 'secondary'}>
                                  {apt.status}
                                </Badge>
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
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Services</CardTitle>
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
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {services.map((service) => (
                            <TableRow key={service.id}>
                              <TableCell className="font-medium">{service.name}</TableCell>
                              <TableCell>{service.description}</TableCell>
                              <TableCell>{service.price_range}</TableCell>
                              <TableCell>{service.duration_minutes} min</TableCell>
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
                <CardHeader>
                  <CardTitle className="text-lg md:text-xl">Staff</CardTitle>
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
                            <TableHead>Total Cost</TableHead>
                            <TableHead>Payment Status</TableHead>
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
                              <TableCell className="font-semibold">${cs.total_cost?.toFixed(2)}</TableCell>
                              <TableCell>
                                <Badge variant={cs.payment_status === 'paid' ? 'default' : cs.payment_status === 'partial paid' ? 'secondary' : 'destructive'}>
                                  {cs.payment_status || 'unpaid'}
                                </Badge>
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
