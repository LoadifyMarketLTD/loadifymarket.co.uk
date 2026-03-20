import { ShieldCheck, Star } from "lucide-react";

const TrustSection = () => {
  return (
    <section className="border-y border-border bg-muted/40 py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>Trusted by UK Sellers</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Stripe logo */}
            <svg className="h-4 w-10" viewBox="0 0 60 25" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M60 12.5C60 8.1 57.6 4.5 53.1 4.5C48.6 4.5 45.8 8.1 45.8 12.5C45.8 17.6 49.1 20.5 53.6 20.5C55.8 20.5 57.5 20 58.8 19.1V15.6C57.5 16.4 56 16.9 54.2 16.9C52.4 16.9 50.8 16.2 50.6 14H59.9C59.9 13.8 60 13 60 12.5ZM50.5 10.9C50.5 9.2 51.5 8.3 53.1 8.3C54.6 8.3 55.6 9.2 55.6 10.9H50.5ZM39.6 4.5C37.8 4.5 36.6 5.3 35.9 5.9L35.7 4.8H31.4V24.5L36 23.5L36 19.2C36.7 19.7 37.8 20.5 39.5 20.5C43 20.5 46.1 17.7 46.1 12.3C46.1 7.4 43 4.5 39.6 4.5ZM38.6 16.7C37.4 16.7 36.7 16.3 36.1 15.7L36 9.5C36.7 8.9 37.4 8.5 38.6 8.5C40.6 8.5 41.9 10.3 41.9 12.6C41.9 14.9 40.6 16.7 38.6 16.7ZM27.1 3.7L31.6 2.8V-0.8L27.1 0.1V3.7ZM27.1 4.8H31.6V20.2H27.1V4.8ZM22.8 6L22.6 4.8H18.4V20.2H22.9V9.7C24 8.3 25.9 8.6 26.5 8.8V4.8C25.8 4.5 23.9 4.1 22.8 6ZM13.7 1.3L9.3 2.2L9.3 15.9C9.3 18.6 11.3 20.5 14 20.5C15.5 20.5 16.6 20.2 17.2 19.9V16.3C16.6 16.5 13.7 17.4 13.7 14.7V8.7H17.2V4.8H13.7V1.3ZM4.8 9.6C4.8 8.8 5.5 8.4 6.5 8.4C8 8.4 9.8 8.9 11.3 9.7V5.5C9.7 4.8 8.1 4.5 6.5 4.5C2.6 4.5 0 6.6 0 9.8C0 14.9 7 14.1 7 16.3C7 17.2 6.1 17.6 5.1 17.6C3.4 17.6 1.5 17 0 16V20.3C1.6 21 3.4 21.5 5.1 21.5C9.1 21.5 11.8 19.4 11.8 16.2C11.8 10.7 4.8 11.7 4.8 9.6Z" fill="#635BFF"/>
            </svg>
            <span>Secure Payments</span>
          </div>
          <div className="flex items-center gap-2.5">
            {/* Google logo */}
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>Verified on Google</span>
            <div className="flex items-center gap-0.5 ml-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className="h-3 w-3 fill-amber-400 text-amber-400"
                />
              ))}
              <span className="text-xs font-semibold text-foreground ml-1">5.0</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
