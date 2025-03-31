import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { useSession } from "next-auth/react";
import { ThemeToggle } from "./theme-toggle";
import { Home, Book, GamepadIcon, BarChart3Icon } from "lucide-react";
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
import { useSignOut } from "./auth-sign-out";

const sidebarNavItems = [
  {
    title: "Dashboard",
    href: "/student",
    icon: Home,
  },
  {
    title: "Assessments",
    href: "/student/assessments",
    icon: Book,
  },
  {
    title: "Games",
    href: "/student/games",
    icon: GamepadIcon,
  },
  {
    title: "Reports",
    href: "/student/reports",
    icon: BarChart3Icon,
  },
];

interface StudentSidebarProps {
  className?: string;
}

export function StudentSidebar({ className }: StudentSidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const signOutHandler = useSignOut();

  return (
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
            <Link
              key={item.href}
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
                    {session?.user?.email?.charAt(0).toUpperCase() || "S"}
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
                  <p className="text-xs text-muted-foreground">Student</p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/student/settings">Settings</Link>
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
  );
} 