import { Link } from "react-router-dom";
import MainLayout from "@/layouts/MainLayout";
import SEO from "@/components/SEO";

const NotFound = () => {
  return (
    <MainLayout>
      <SEO
        title="Page Not Found | Loadify Market"
        description="The page you are looking for does not exist. Return to the homepage or browse products on Loadify Market."
        robots="noindex, nofollow"
      />
      <main id="main-content" className="flex-1 flex items-center justify-center pt-4 md:pt-28 pb-20 px-4">
        <div className="text-center">
          <p className="text-primary font-bold text-lg mb-3 tracking-widest uppercase">404</p>
          <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-white mb-4 leading-tight">
            Page Not Found
          </h1>
          <p className="text-white/75 text-base mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist or may have been moved.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link
              to="/"
              className="inline-flex items-center justify-center font-bold rounded-full px-8 py-3 text-white"
              style={{
                background: "rgba(212,175,55,1)",
                boxShadow: "0 4px 20px rgba(212,175,55,0.40)",
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

