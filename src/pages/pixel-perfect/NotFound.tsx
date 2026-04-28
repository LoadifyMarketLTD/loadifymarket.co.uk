import { Link, useLocation } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <MainLayout>
      <main id="main-content" className="flex-1 flex items-center justify-center pt-28 pb-20 px-4">
        <div className="text-center">
          <p className="text-[#FBBF24] font-bold text-lg mb-3 tracking-widest uppercase">404</p>
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
                background: "linear-gradient(90deg,#FBBF24 0%,#D97706 100%)",
                boxShadow: "0 4px 20px rgba(251,191,36,0.40)",
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
    </MainLayout>
  );
};

export default NotFound;

