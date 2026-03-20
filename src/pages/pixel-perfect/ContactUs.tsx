import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const ContactUs = () => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Message sent",
      description: "Thank you for contacting us. We'll get back to you within 24–48 hours.",
    });
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 pb-20">
        <div className="container mx-auto px-4 max-w-5xl">
          <BreadcrumbNav items={[{ label: "Home", to: "/" }, { label: "Contact Us" }]} backTo="/" />
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground mb-4">
            Contact Us
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl">
            Have a question, need support, or want to discuss a business enquiry? Get in touch and our team will respond as soon as possible.
          </p>

          <div className="grid md:grid-cols-2 gap-10">
            {/* Contact form */}
            <div>
              <h2 className="text-xl font-display font-semibold text-foreground mb-5">
                Send Us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="john@company.co.uk" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="How can we help?" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Tell us more about your enquiry..." rows={5} required />
                </div>
                <Button type="submit" className="w-full sm:w-auto">
                  Send Message
                </Button>
              </form>
            </div>

            {/* Contact details */}
            <div className="space-y-6">
              <h2 className="text-xl font-display font-semibold text-foreground mb-5">
                Get in Touch
              </h2>

              <div className="space-y-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Email</p>
                    <a href="mailto:loadifymarket.co.uk@gmail.com" className="text-sm text-primary hover:underline">
                      loadifymarket.co.uk@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Office Address</p>
                    <p className="text-sm text-muted-foreground">
                      101 Cornelian Street<br />
                      Blackburn BB1 9QL<br />
                      United Kingdom
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Response Time</p>
                    <p className="text-sm text-muted-foreground">
                      We aim to respond to all enquiries within 24–48 hours during business days (Mon–Fri).
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm font-medium text-foreground mb-1">Business Enquiries</p>
                <p className="text-sm text-muted-foreground">
                  For partnership, wholesale supply or volume trading enquiries, please email us directly with "Business Enquiry" in the subject line.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ContactUs;
