import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    document.title = "Admin Dashboard | Rogova Auto Shop";
  }, []);

  const handleLogout = () => {
    navigate("/admin-login");
    toast({ title: "Logged out" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="container px-4 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
        <p className="text-muted-foreground">
          This page was temporarily simplified to resolve a build error. We’ll restore the full dashboard next.
        </p>
      </main>
    </div>
  );
}
