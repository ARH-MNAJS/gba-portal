"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { User } from "lucide-react";
import { useSignOut } from "./auth-sign-out";
import { useSession } from "next-auth/react";

export function Header() {
  const { data: session } = useSession();
  const signOutHandler = useSignOut();

  return (
    <header className="sticky top-0 z-40 border-b bg-background w-full">
      <div className="container flex h-16 items-center justify-between py-4 max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center">
            <span className="text-xl font-bold">
              <span className="text-primary">C</span>ogni<span className="text-primary">C</span>ore
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>
                      {session.user.email?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {session.user.email && (
                      <p className="text-sm font-medium">{session.user.email}</p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {session.user.role}
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">Profile</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/${session.user.role}`}>Dashboard</Link>
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
          ) : (
            <Button asChild>
              <Link href="/login">Login</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
} 