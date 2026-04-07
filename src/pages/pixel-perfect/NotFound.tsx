import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[#0A1930] flex flex-col">
      <Header forceOpaque />
      <main className="flex-1 flex items-center justify-center pt-16 lg:pt-[104px] pb-20 px-4">
        <div className="text-center">
          <p className="text-[#22C55E] font-bold text-lg mb-3 tracking-widest uppercase">404</p>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mb-4 leading-tight">
            Page Not Found
          </h1>
          <p className="text-white/60 text-base mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center font-bold rounded-full px-8 py-3 text-white"
              style={{
                background: "linear-gradient(90deg,#22c55e 0%,#16a34a 100%)",
                boxShadow: "0 4px 20px rgba(34,197,94,0.40)",
              }}
            >
              Return Home
            </Link>
            <Link
              to="/catalog"
              className="inline-flex items-center justify-center font-semibold rounded-full px-8 py-3 text-white/85 border border-white/25"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              Browse Products
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;

