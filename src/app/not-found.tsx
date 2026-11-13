import Image from "next/image";
import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-[100dvh] flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="flex justify-center">
          <Link href="/" aria-label="AbangCebu Home">
            <Image
              src="/icons/main_Logo.png"
              alt="AbangCebu"
              width={299}
              height={100}
              unoptimized
              className="h-10 w-auto dark:hidden"
              priority
            />
            <Image
              src="/icons/main_Logo_Light.png"
              alt="AbangCebu"
              width={299}
              height={100}
              unoptimized
              className="hidden h-10 w-auto dark:block"
              priority
            />
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold uppercase tracking-wider text-action">404 · Page Not Found</p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Lost in Cebu?
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base max-w-sm mx-auto leading-relaxed">
            The page you are looking for doesn’t exist or has moved. Let’s get you back to discovering rentals.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-action px-5 py-2.5 text-sm font-semibold text-action-foreground shadow-sm hover:bg-action-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring transition-colors"
          >
            <Compass size={18} aria-hidden="true" />
            <span>Explore Map</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
