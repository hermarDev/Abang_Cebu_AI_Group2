import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MapPin, Sparkles, Database, Layers, ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center">
      {/* Hero Section */}
      <section className="w-full py-16 md:py-24 lg:py-32 bg-gradient-to-b from-blue-50/60 to-white dark:from-zinc-950 dark:to-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="container mx-auto max-w-5xl px-4 text-center sm:px-6">
          <div className="flex justify-center mb-4">
            <Badge variant="default" className="gap-1.5 py-1 px-3 text-xs">
              <Sparkles className="h-3.5 w-3.5" /> Next.js 15 + Supabase + MapLibre GL
            </Badge>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl">
            Intelligent Rentals in Cebu with{" "}
            <span className="text-blue-600 dark:text-blue-400">AbangCebuAI</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-600 dark:text-zinc-400">
            A high-performance geospatial platform for discovering and renting properties across Metro Cebu. Engineered with React Server Components and isolated client map boundaries.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/map">
              <Button size="lg" className="gap-2">
                <MapPin className="h-4 w-4" />
                Launch Map Explorer
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a
              href="https://github.com/hermarDev/Abang_Cebu_AI_Group2"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="lg">
                View Repository
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Architectural Highlights */}
      <section className="container mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Enterprise Architecture & Multi-Developer Foundation
          </h2>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400 text-sm">
            Strict separation of concerns, type safety, and clean client/server boundaries.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 mb-2 dark:bg-blue-950 dark:text-blue-400">
                <Layers className="h-5 w-5" />
              </div>
              <CardTitle>Next.js 15 App Router</CardTitle>
              <CardDescription>
                React 19 Server Components with asynchronous cookies, params, and Turbopack dev tooling.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-500">
              Zero client JS footprint for pages and listings layout. Full SSR streaming support.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 mb-2 dark:bg-emerald-950 dark:text-emerald-400">
                <MapPin className="h-5 w-5" />
              </div>
              <CardTitle>MapLibre GL Boundary</CardTitle>
              <CardDescription>
                Strictly quarantined WebGL map engine with automatic lifecycle cleanup and dynamic ssr:false.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-500">
              Guaranteed zero window/canvas hydration mismatch errors during server pre-rendering.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600 mb-2 dark:bg-purple-950 dark:text-purple-400">
                <Database className="h-5 w-5" />
              </div>
              <CardTitle>Supabase SSR Integration</CardTitle>
              <CardDescription>
                PostgreSQL with PostGIS spatial data, Row Level Security, and async @supabase/ssr client.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-zinc-500">
              Dual client setup: Browser client for subscriptions and Server client for secure queries.
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
