import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import { Mail, MapPin, Clock, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { BRAND } from "@/constants/brand";
import { formatPhoneNumber } from "@/lib/utils";

const SUPPORT_EMAIL = import.meta.env.VITE_SUPPORT_EMAIL || BRAND.supportEmail;

function encode(data: Record<string, string>) {
  return Object.keys(data)
    .map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(data[key]))
    .join("&");
}

const ContactUs = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    "bot-field": "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");

    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encode({ "form-name": "contact", ...formData }),
      });

      if (!res.ok) throw new Error("Submit failed");

      setFormData({ name: "", email: "", subject: "", message: "", "bot-field": "" });
      setStatus("success");
    } catch {
      setStatus("error");
    }
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
              <form
                name="contact"
                method="POST"
                data-netlify="true"
                netlify-honeypot="bot-field"
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {/* Required hidden inputs for Netlify Forms */}
                <input type="hidden" name="form-name" value="contact" />

                {/* Honeypot — hidden from real users */}
                <div className="hidden" aria-hidden="true">
                  <Label htmlFor="bot-field">Don&apos;t fill this out if you&apos;re human:</Label>
                  <Input
                    id="bot-field"
                    name="bot-field"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formData["bot-field"]}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" placeholder="John Smith" required value={formData.name} onChange={handleChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" placeholder="john@company.co.uk" required value={formData.email} onChange={handleChange} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" name="subject" placeholder="How can we help?" value={formData.subject} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" name="message" placeholder="Tell us more about your enquiry..." rows={5} required value={formData.message} onChange={handleChange} />
                </div>

                <Button type="submit" className="w-full sm:w-auto" disabled={status === "loading"}>
                  {status === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    "Send Message"
                  )}
                </Button>

                {status === "success" && (
                  <p className="text-sm text-green-600 font-medium pt-1">
                    Thank you. Your message has been sent successfully.
                  </p>
                )}
                {status === "error" && (
                  <p className="text-sm text-destructive font-medium pt-1">
                    Something went wrong. Please try again.
                  </p>
                )}
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
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm text-primary hover:underline">
                      {SUPPORT_EMAIL}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">Phone</p>
                    <a href={`tel:${BRAND.supportPhone}`} className="text-sm text-primary hover:underline">
                      {formatPhoneNumber(BRAND.supportPhone)}
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
