import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { Home, Users, GamepadIcon, BarChartIcon, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Avatar,
  AvatarFallback,
} from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { useState } from "react";
import { useSignOut } from "./auth-sign-out";

const sidebarNavItems = [
  {
    title: "Home",
    href: "/admin",
    icon: Home,
  },
  {
    title: "Users",
    href: "/admin/user",
    icon: Users,
  },
  {
    title: "Assessments",
    href: "/admin/assessments",
    icon: GamepadIcon,
  },
  {
    title: "Reports",
    icon: BarChartIcon,
    submenu: true,
    submenuItems: [
      {
        title: "Practice",
        href: "/admin/reports/practice",
      },
      {
        title: "Assessments",
        href: "/admin/reports/assessments",
      },
    ],
  },
];

interface AdminSidebarProps {
  className?: string;
}

export function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const signOutHandler = useSignOut();

  const toggleSubmenu = (title: string) => {
    setOpenSubmenu(openSubmenu === title ? null : title);
  };

  return (
    <>
      {/* Mobile Sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <div className="flex h-full flex-col">
            <div className="flex h-14 items-center border-b px-4">
              <Link 
                href="/" 
                className="flex items-center" 
                onClick={() => setOpen(false)}
              >
                <span className="text-xl font-bold">
                  <span className="text-primary">C</span>ogni<span className="text-primary">C</span>ore
                </span>
              </Link>
            </div>
            <div className="flex-1 overflow-auto py-2">
              <nav className="grid items-start px-2 text-sm font-medium">
                {sidebarNavItems.map((item) => (
                  <div key={item.title}>
                    {item.submenu ? (
                      <>
                        <button
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all hover:text-primary",
                            openSubmenu === item.title
                              ? "bg-accent text-primary"
                              : "text-muted-foreground"
                          )}
                          onClick={() => toggleSubmenu(item.title)}
                        >
                          <span className="flex items-center gap-3">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </span>
                          <ChevronDown className={cn("h-4 w-4 transition-transform", openSubmenu === item.title ? "rotate-180" : "")} />
                        </button>
                        {openSubmenu === item.title && (
                          <div className="ml-6 mt-1 space-y-1">
                            {item.submenuItems?.map((subitem) => (
                              <Link
                                key={subitem.href}
                                href={subitem.href}
                                onClick={() => setOpen(false)}
                                className={cn(
                                  "block rounded-lg px-3 py-2 transition-all hover:text-primary",
                                  pathname === subitem.href
                                    ? "bg-accent text-primary"
                                    : "text-muted-foreground"
                                )}
                              >
                                {subitem.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                          pathname === item.href
                            ? "bg-accent text-primary"
                            : "text-muted-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>
            <div className="mt-auto border-t p-4">
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {session?.user?.email?.charAt(0).toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        {session?.user?.email && (
                          <p className="text-sm font-medium">{session.user.email}</p>
                        )}
                        <p className="text-xs text-muted-foreground">Admin</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings">Settings</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      onSelect={signOutHandler}
                    >
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-background md:flex md:flex-col",
          className
        )}
      >
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">
              <span className="text-primary">C</span>ogni<span className="text-primary">C</span>ore
            </span>
          </Link>
        </div>
        <div className="flex-1 overflow-auto py-4">
          <nav className="grid items-start px-2 text-sm font-medium">
            {sidebarNavItems.map((item) => (
              <div key={item.title}>
                {item.submenu ? (
                  <>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 transition-all hover:text-primary",
                        openSubmenu === item.title
                          ? "bg-accent text-primary"
                          : "text-muted-foreground"
                      )}
                      onClick={() => toggleSubmenu(item.title)}
                    >
                      <span className="flex items-center gap-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </span>
                      <ChevronDown className={cn("h-4 w-4 transition-transform", openSubmenu === item.title ? "rotate-180" : "")} />
                    </button>
                    {openSubmenu === item.title && (
                      <div className="ml-6 mt-1 space-y-1">
                        {item.submenuItems?.map((subitem) => (
                          <Link
                            key={subitem.href}
                            href={subitem.href}
                            className={cn(
                              "block rounded-lg px-3 py-2 transition-all hover:text-primary",
                              pathname === subitem.href
                                ? "bg-accent text-primary"
                                : "text-muted-foreground"
                            )}
                          >
                            {subitem.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary",
                      pathname === item.href
                        ? "bg-accent text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                )}
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto border-t p-4">
          <div className="flex items-center justify-between">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {session?.user?.email?.charAt(0).toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session?.user?.email && (
                      <p className="text-sm font-medium">{session.user.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings">Settings</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={signOutHandler}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>
    </>
  );
} 