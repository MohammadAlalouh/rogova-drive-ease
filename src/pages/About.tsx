import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, Clock, ThumbsUp } from "lucide-react";

export default function About() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">About Rogova Auto Shop</h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Your trusted automotive service partner in Halifax, Nova Scotia
            </p>
          </div>

          <div className="prose prose-lg max-w-3xl mx-auto mb-16">
            <p className="text-foreground">
              At Rogova Auto Shop, we've been serving the Halifax community with pride and dedication. 
              Our team of certified technicians brings years of experience and expertise to every service, 
              ensuring your vehicle receives the best care possible.
            </p>
            <p className="text-foreground">
              We understand that your vehicle is more than just transportation—it's an essential part of 
              your daily life. That's why we're committed to providing honest, reliable service that keeps 
              you safe on the road.
            </p>
          </div>

          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8">Why Choose Us</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-elevation">
                <CardHeader>
                  <Award className="h-12 w-12 text-accent mb-2" />
                  <CardTitle>Certified Excellence</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Our technicians are fully certified and continuously trained on the latest automotive technology
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevation">
                <CardHeader>
                  <Users className="h-12 w-12 text-accent mb-2" />
                  <CardTitle>Customer First</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We prioritize clear communication and customer satisfaction in every interaction
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevation">
                <CardHeader>
                  <Clock className="h-12 w-12 text-accent mb-2" />
                  <CardTitle>Efficient Service</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We respect your time with fast, efficient service without compromising on quality
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-elevation">
                <CardHeader>
                  <ThumbsUp className="h-12 w-12 text-accent mb-2" />
                  <CardTitle>Quality Guarantee</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We stand behind our work with a comprehensive satisfaction guarantee
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="bg-secondary p-8 rounded-lg">
            <h2 className="text-3xl font-bold text-center mb-4">Our Location</h2>
            <p className="text-center text-xl mb-6">
              37 Veronica Dr, Halifax, NS
            </p>
            <p className="text-center text-muted-foreground">
              Conveniently located to serve the Halifax area with easy parking and accessibility
            </p>
          </div>
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