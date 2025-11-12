import { Link, useLocation } from "react-router-dom";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Navigation = () => {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold text-xl">
          <Wrench className="h-6 w-6 text-accent" />
          <span>Rogova Auto Shop</span>
        </Link>
        
        <div className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/") ? "text-primary" : "text-foreground"
            }`}
          >
            Home
          </Link>
          <Link 
            to="/services" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/services") ? "text-primary" : "text-foreground"
            }`}
          >
            Services
          </Link>
          <Link 
            to="/about" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/about") ? "text-primary" : "text-foreground"
            }`}
          >
            About
          </Link>
          <Link 
            to="/contact" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/contact") ? "text-primary" : "text-foreground"
            }`}
          >
            Contact
          </Link>
          <Link to="/book">
            <Button className="bg-accent hover:bg-accent/90">
              Book Appointment
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};