import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container mx-auto flex h-[60vh] max-w-md flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-extrabold text-blue-600">404</h1>
      <h2 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
        Page Not Found
      </h2>
      <p className="mt-2 text-sm text-zinc-500">
        The rental listing or page you are looking for does not exist.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button>Back to Homepage</Button>
        </Link>
      </div>
    </div>
  );
}
