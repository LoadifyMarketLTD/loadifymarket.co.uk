import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import type { User } from "@/types";

interface DrawerAccountBlockProps {
  user: User | null;
  dashboardPath: string;
  onLogout: () => void;
  onClose: () => void;
}

const DrawerAccountBlock = ({
  user,
  dashboardPath,
  onLogout,
  onClose,
}: DrawerAccountBlockProps) => {
  if (user) {
    const initial = user.firstName?.[0]?.toUpperCase() ?? user.email?.[0]?.toUpperCase() ?? "U";
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">
            {initial}
          </div>
          <span className="text-sm font-semibold text-white">
            Hi, {user.firstName ?? "there"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 h-11 text-white/80 hover:text-green-400 hover:bg-white/10 font-medium"
            asChild
          >
            <Link to={dashboardPath} onClick={onClose}>
              {user.role === "admin" ? "Admin Hub" : "Dashboard"}
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-11 border-white/20 text-white/80 hover:bg-white/10 hover:text-white bg-transparent font-medium"
            onClick={() => {
              onClose();
              onLogout();
            }}
          >
            Sign Out
          </Button>
        </div>
        {user.role !== "admin" && (
          <Button
            size="sm"
            className="w-full h-11 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold rounded-full shadow-lg transition-all duration-300"
            asChild
          >
            <Link to="/pp/seller" onClick={onClose}>
              Start Selling
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 h-11 text-white/80 hover:text-green-400 hover:bg-white/10 font-medium"
          asChild
        >
          <Link to="/login" onClick={onClose}>
            Sign In
          </Link>
        </Button>
        <Button
          size="sm"
          className="flex-1 h-11 bg-gradient-to-r from-green-400 to-green-500 hover:from-green-300 hover:to-green-400 text-black font-semibold rounded-full shadow-lg transition-all duration-300"
          asChild
        >
          <Link to="/signup?type=seller" onClick={onClose}>
            Start Selling
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default DrawerAccountBlock;
