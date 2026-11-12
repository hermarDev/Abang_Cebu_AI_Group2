"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Shield, X } from "lucide-react";

export function LivenessProofOfConcept({ enabled = false }: { enabled?: boolean }) {
  const isProduction = process.env.NODE_ENV === "production";
  const [status, setStatus] = useState<"idle" | "requesting" | "running" | "denied" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);
  const faceDetectorRef = useRef<unknown>(null);

  const stopCamera = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (faceDetectorRef.current) {
      faceDetectorRef.current = null;
    }
  }, []);

  const runMockChallenge = useCallback(() => {
    // Mock randomized short challenge
    const challenges = ["Turn your head slightly left", "Turn your head slightly right", "Smile", "Blink"];
    const challenge = challenges[Math.floor(Math.random() * challenges.length)];
    setError(challenge); // Reusing error state for challenge display

    // Simulate processing for 3 seconds
    setTimeout(() => {
      if (status === "running") {
        setStatus("idle");
        setError("Challenge complete (experimental)");
        stopCamera();
      }
    }, 3000);
  }, [status, stopCamera]);

  const startCamera = useCallback(async () => {
    if (!enabled || isProduction) return;
    setStatus("requesting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("running");
      // In a real implementation, we would initialize MediaPipe FaceLandmarker here
      // For POC, we just show the camera feed and run a mock challenge
      runMockChallenge();
    } catch (err) {
      setStatus("denied");
      setError(err instanceof Error ? err.message : "Camera access denied");
    }
  }, [enabled, isProduction, runMockChallenge]);

  useEffect(() => {
    if (enabled && !isProduction) {
      setTimeout(() => startCamera());
    }
    return () => stopCamera();
  }, [enabled, isProduction, startCamera, stopCamera]);

  if (isProduction || !enabled) {
    return (
      <Card data-surface="finder" className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
            <Shield className="size-5 text-muted-foreground" aria-hidden="true" />
            Human Presence Check
          </CardTitle>
          <CardDescription>Experimental liveness check (no account verification)</CardDescription>
        </CardHeader>
        <CardContent className="text-center py-4">
          <p data-liveness-status className="text-muted-foreground">
            {isProduction ? "Liveness check disabled in production" : "Enable the <code>enabled</code> prop to run the experimental POC"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-surface="finder" className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold flex items-center justify-center gap-2">
          <Shield className="size-5 text-muted-foreground" aria-hidden="true" />
          Human Presence Check
        </CardTitle>
        <CardDescription data-liveness-label>Experimental liveness check (no account verification)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            aria-hidden="true"
          />
          {status === "requesting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <span className="animate-pulse">Requesting camera access…</span>
            </div>
          )}
          {status === "denied" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="text-center p-4">
                <p className="mb-2">{error || "Camera access denied"}</p>
                <Button variant="outline" className="w-full" onClick={startCamera}>
                  Retry Camera
                </Button>
              </div>
            </div>
          )}
          {status === "running" && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm animate-pulse">
              {error || "Analyzing…"}
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
              <div className="text-center p-4">
                <p className="mb-2 text-destructive">{error || "An error occurred"}</p>
                <Button variant="outline" className="w-full" onClick={startCamera}>
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${status === "running" ? "bg-emerald-500 animate-pulse" : status === "idle" ? "bg-muted-foreground" : "bg-destructive"}`} aria-hidden="true" />
            <span className="text-sm text-muted-foreground capitalize">{status}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={stopCamera} disabled={status === "idle" || status === "requesting"}>
            <X className="size-4" aria-hidden="true" />
            <span className="sr-only">Stop camera</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Experimental only — no biometric data stored. Does not verify legal identity.
        </p>
      </CardContent>
    </Card>
  );
}