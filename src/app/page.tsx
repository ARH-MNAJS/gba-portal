import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Brain } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col w-full">
      <Header />
      <main className="flex-1 w-full flex items-center justify-center">
        <div className="container flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-4xl font-bold text-center">
              Welcome to <span className="text-black dark:text-white font-bold">X</span>cel<span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent animate-gradient">IQ</span>
            </h1>
          </div>
          <p className="text-muted-foreground text-center max-w-lg">
            A game-based assessment platform designed to make learning fun and engaging.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
