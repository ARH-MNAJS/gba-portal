"use client";

import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0 w-full">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row max-w-7xl mx-auto px-4">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          &copy; {new Date().getFullYear()} CogniCore. All rights reserved.
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:underline">
            Terms
          </Link>
          <Link href="/privacy" className="hover:underline">
            Privacy
          </Link>
          <Link href="/contact" className="hover:underline">
            Contact
          </Link>
        </div>
      </div>
    </footer>
  );
} 