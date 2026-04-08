import { Link } from "react-router-dom";

export default function StickyCTA() {
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center sm:hidden z-50">
      <Link
        to="/register"
        className="bg-green-500 text-black px-6 py-3 rounded-full shadow-lg font-semibold"
      >
        Join the Launch
      </Link>
    </div>
  );
}
