import { Link, useLocation } from "wouter";
import { Home, CalendarDays, Dumbbell, LineChart, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Today" },
    { href: "/plan", icon: CalendarDays, label: "Plan" },
    { href: "/workout/new", icon: Dumbbell, label: "Workout", isCenter: true },
    { href: "/progress", icon: LineChart, label: "Progress" },
    { href: "/history", icon: History, label: "History" },
  ];

  // Hide nav on workout active and complete screens
  const hideNav = location.startsWith("/workout/active/") || location.includes("/complete") || location === "/onboarding";

  return (
    <div className="min-h-[100dvh] bg-background w-full flex flex-col md:flex-row relative">
      <main className={cn(
        "flex-1 w-full max-w-2xl mx-auto pb-20 md:pb-0 md:pt-4 transition-all duration-300",
        hideNav && "pb-0 md:pb-0 max-w-full md:max-w-2xl"
      )}>
        {children}
      </main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:relative md:w-20 md:border-t-0 md:border-r flex md:flex-col justify-around md:justify-start items-center p-2 md:p-4 md:gap-8">
          <div className="hidden md:flex flex-col gap-8 w-full items-center mt-4">
             {navItems.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-xl transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}>
                    <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </Link>
                );
             })}
          </div>

          <div className="flex md:hidden w-full justify-around items-end pb-2">
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const Icon = item.icon;

              if (item.isCenter) {
                return (
                  <Link key={item.href} href={item.href} className="relative -top-5 flex flex-col items-center justify-center">
                    <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20 border-4 border-background text-primary-foreground hover:scale-105 transition-transform">
                      <Icon size={28} strokeWidth={2.5} />
                    </div>
                  </Link>
                );
              }

              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex flex-col items-center gap-1 p-2 min-w-[64px] transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}