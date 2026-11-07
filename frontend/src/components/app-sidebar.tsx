import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import {
  Bell,
  BookOpenText,
  ClipboardCheck,
  FileSearch,
  History,
  LayoutDashboard,
  Menu,
  ScanSearch,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { useAppState } from "@/lib/store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: ["creator", "reviewer", "admin"] },
  { title: "Brand Knowledge", url: "/brand-knowledge", icon: BookOpenText, roles: ["creator", "admin"] },
  { title: "Content Analyzer", url: "/analyzer", icon: ScanSearch, roles: ["creator"] },
  { title: "Compliance Reports", url: "/reports", icon: FileSearch, roles: ["creator", "reviewer", "admin"] },
  { title: "Review Center", url: "/review", icon: ClipboardCheck, roles: ["reviewer", "admin"] },
  { title: "History", url: "/history", icon: History, roles: ["creator"] },
  { title: "Settings", url: "/settings", icon: Settings, roles: ["creator", "reviewer", "admin"] },
] as const;

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/brand-knowledge": "Brand Knowledge",
  "/analyzer": "Content Analyzer",
  "/reports": "Compliance Reports",
  "/review": "Review Center",
  "/history": "History",
  "/settings": "Settings",
};

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
const visibleItems = NAV_ITEMS.filter(
  (item) => user && (item.roles as readonly string[]).includes(user.role)
);
  return (
    <nav className="flex flex-col gap-1 px-3">
      {visibleItems.map((item) => {
        const active =
          item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);
        return (
          <Link
            key={item.url}
            to={item.url}
            onClick={onNavigate}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            <span>{item.title}</span>
            {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const state = useAppState();
  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 pt-6 pb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
          <ShieldCheck className="h-5.5 w-5.5 text-primary-foreground" />
        </div>
        <div>
          <p className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">
            VerityAI
          </p>
          <p className="text-[11px] text-sidebar-foreground/60">Every Brand Decision, Verified.</p>
        </div>
      </div>

      <p className="px-6 pb-2 text-[11px] font-semibold tracking-wider text-sidebar-foreground/50 uppercase">
        Workspace
      </p>
      <NavLinks {...(onNavigate ? { onNavigate } : {})} />

      <div className="mt-auto p-4">
        <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3">
          <p className="text-[11px] tracking-wider text-sidebar-foreground/60 uppercase">
            Organisation
          </p>
          <p className="mt-0.5 truncate text-sm font-semibold text-sidebar-accent-foreground">
            {state.org.name}
          </p>
          <p className="text-xs text-sidebar-foreground/60">{state.org.industry}</p>
        </div>
      </div>
    </div>
  );
}

function NotificationsMenu() {
  const state = useAppState();
  const pending = state.submissions.filter((s) => s.reviewStatus === "pending_review");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-full border bg-card text-muted-foreground transition-colors hover:bg-muted"
        >
          <Bell className="h-4.5 w-4.5" />
          {pending.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {pending.length}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {pending.length === 0 ? (
          <DropdownMenuItem disabled>No pending reviews — all caught up.</DropdownMenuItem>
        ) : (
          pending.slice(0, 5).map((s) => (
            <DropdownMenuItem key={s.id} asChild>
              <Link to="/review/$id" params={{ id: s.id }} className="flex flex-col gap-0.5">
                <span className="truncate text-sm font-medium">Review waiting: {s.title}</span>
                <span className="text-xs text-muted-foreground">
                  {s.analysis.issues.length} issue{s.analysis.issues.length === 1 ? "" : "s"} detected
                </span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Avatar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("");

  function handleLogout() {
  logout();
  window.location.href = "/login";
}

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
        {initials}
      </div>

      <div className="hidden md:block">
        <p className="text-sm leading-tight font-medium">{user.name}</p>
        <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
      >
        Logout
      </button>
    </div>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const pageTitle = PAGE_TITLES[pathname] ?? "VerityAI";
  if (pathname === "/login" || pathname === "/register") {
  return <>{children}</>;
}
  return (
    <div className="min-h-screen w-full bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarBody />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 shadow-2xl">
            <button
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 z-10 rounded-md p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/90 px-4 backdrop-blur-md md:px-6">
          <button
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border bg-card text-muted-foreground transition-colors hover:bg-muted lg:hidden"
          >
            <Menu className="h-4.5 w-4.5" />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">{pageTitle}</h1>
          <div className="ml-auto flex items-center gap-3">
            <NotificationsMenu />
            <Avatar />
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
