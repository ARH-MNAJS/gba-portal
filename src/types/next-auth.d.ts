import { UserRole } from "@/lib/supabase";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    role: UserRole;
    name?: string;
    accessToken?: string;
    refreshToken?: string;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      role: UserRole;
      name?: string;
    };
    supabaseAccessToken: string;
    supabaseRefreshToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    accessToken?: string;
    refreshToken?: string;
  }
} 