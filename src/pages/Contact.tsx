import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, Facebook, Instagram, MessageCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Get in touch with us through any of these channels
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="shadow-elevation">
              <CardHeader>
                <Phone className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Phone</CardTitle>
              </CardHeader>
              <CardContent>
                <a href="tel:+19021234567" className="text-lg text-primary hover:underline">
                  (902) 123-4567
                </a>
                <p className="text-muted-foreground mt-2">Monday - Friday: 8AM - 6PM</p>
                <p className="text-muted-foreground">Saturday: 9AM - 4PM</p>
              </CardContent>
            </Card>

            <Card className="shadow-elevation">
              <CardHeader>
                <Mail className="h-8 w-8 text-accent mb-2" />
                <CardTitle>Email</CardTitle>
              </CardHeader>
              <CardContent>
                <a href="mailto:info@rogovaautoshop.com" className="text-lg text-primary hover:underline">
                  info@rogovaautoshop.com
                </a>
                <p className="text-muted-foreground mt-2">We'll respond within 24 hours</p>
              </CardContent>
            </Card>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-6">Connect With Us</h2>
            <div className="flex justify-center gap-4">
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open('https://facebook.com', '_blank')}
              >
                <Facebook className="h-5 w-5" />
                Facebook
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open('https://instagram.com', '_blank')}
              >
                <Instagram className="h-5 w-5" />
                Instagram
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="gap-2"
                onClick={() => window.open('https://wa.me/19021234567', '_blank')}
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </Button>
            </div>
          </div>

          <Card className="shadow-strong">
            <CardHeader>
              <MapPin className="h-8 w-8 text-accent mb-2" />
              <CardTitle>Visit Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg mb-4">37 Veronica Dr, Halifax, NS</p>
              <div className="aspect-video w-full rounded-lg overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2839.5!2d-63.582!3d44.637!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2z37+BoMOCwrAwMCc5LjMiTiA2M8KwMzQnNTUuMiJX!5e0!3m2!1sen!2sca!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Rogova Auto Shop Location"
                />
              </div>
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