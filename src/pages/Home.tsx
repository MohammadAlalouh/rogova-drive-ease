import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Wrench, Star, Clock } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section 
        className="relative h-[600px] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
        <div className="container relative z-10 text-center text-primary-foreground">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Expert Auto Care You Can Trust
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-2xl mx-auto">
            Professional automotive services in Halifax, NS. Quality repairs, honest pricing, exceptional service.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/book">
              <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                Book Appointment
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="bg-primary-foreground/10 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/20">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="shadow-elevation">
              <CardHeader>
                <Wrench className="h-12 w-12 text-accent mb-4" />
                <CardTitle>Expert Technicians</CardTitle>
                <CardDescription>
                  Our certified mechanics have years of experience with all makes and models
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-elevation">
              <CardHeader>
                <Clock className="h-12 w-12 text-accent mb-4" />
                <CardTitle>Fast Service</CardTitle>
                <CardDescription>
                  We value your time and complete most services the same day
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="shadow-elevation">
              <CardHeader>
                <Star className="h-12 w-12 text-accent mb-4" />
                <CardTitle>Quality Guaranteed</CardTitle>
                <CardDescription>
                  100% satisfaction guarantee on all repairs and services
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-hero text-primary-foreground">
        <div className="container text-center">
          <Calendar className="h-16 w-16 mx-auto mb-6" />
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Schedule your appointment today and experience the Rogova difference
          </p>
          <Link to="/book">
            <Button size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
              Book Your Appointment Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8">
        <div className="container text-center space-y-2">
          <p className="text-sm">
            © 2025 Rogova Auto Shop. All rights reserved. | 37 Veronica Dr, Halifax, NS
          </p>
          <Link to="/admin/login" className="block">
            <button className="text-sm text-background/70 hover:text-background underline">
              ADMIN LOG IN
            </button>
          </Link>
        </div>
      </footer>
    </div>
  );
}