import { Navigate } from "react-router-dom";
import PresentationHomePage from "@/pages/public/PresentationHomePage";
import { isCapacitorNative } from "@/lib/capacitorUtils";

export default function Home() {
  if (isCapacitorNative()) return <Navigate to="/marketplace" replace />;
  return <PresentationHomePage />;
}
