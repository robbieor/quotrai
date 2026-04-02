import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Shield } from "lucide-react";
import foremanLogo from "@/assets/foreman-logo.png";
import ScrollProgress from "./ScrollProgress";

const NAV_ITEMS = [
  { label: "Pitch", path: "/investor/pitch" },
  { label: "Market", path: "/investor/market" },
  { label: "Product", path: "/investor/product" },
  { label: "Team", path: "/investor/team" },
  { label: "Projections", path: "/investor/projections" },
  { label: "Forecast", path: "/investor/forecast" },
];

interface InvestorLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export default function InvestorLayout({ title, children }: InvestorLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background scroll-smooth">
      <ScrollProgress />
      <header className="border-b border-border/50 bg-[#0f172a] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/investor/pitch">
              <img src={foremanLogo} alt="Foreman" className="h-9 w-9 rounded-lg" />
            </Link>
            <h1 className="text-lg font-bold text-white">{title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <nav className="hidden md:flex items-center gap-4 text-sm mr-4">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`transition-colors ${
                    location.pathname === item.path
                      ? "text-primary font-semibold"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <Badge variant="outline" className="gap-1.5 border-red-500/40 text-red-400 bg-red-500/10">
              <Shield className="h-3 w-3" />
              Confidential
            </Badge>
          </div>
        </div>
        {/* Mobile nav */}
        <div className="md:hidden overflow-x-auto border-t border-white/10">
          <div className="flex items-center gap-1 px-3 py-2">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  location.pathname === item.path
                    ? "bg-primary text-primary-foreground"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
