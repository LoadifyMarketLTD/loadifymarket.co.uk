import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function MicroCTA({ text, link }: { text: string; link: string }) {
  return (
    <div className="flex justify-center py-4">
      <Link
        to={link}
        className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors duration-200 group"
      >
        {text}
        <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
      </Link>
    </div>
  );
}
