"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useState,
  type HTMLAttributes,
  type ImgHTMLAttributes,
} from "react";
import { cn } from "./cn";

type AvatarContextValue = {
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
  hasError: boolean;
  setHasError: (error: boolean) => void;
};

const AvatarContext = createContext<AvatarContextValue | null>(null);

export const Avatar = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    return (
      <AvatarContext.Provider value={{ imageLoaded, setImageLoaded, hasError, setHasError }}>
        <div
          ref={ref}
          className={cn(
            "relative flex size-10 shrink-0 overflow-hidden rounded-full bg-muted",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = "Avatar";

export const AvatarImage = forwardRef<HTMLImageElement, ImgHTMLAttributes<HTMLImageElement>>(
  ({ className, src, alt = "", onError, onLoad, ...props }, ref) => {
    const ctx = useContext(AvatarContext);

    if (!src || ctx?.hasError) return null;

    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn(
          "aspect-square size-full object-cover",
          ctx && !ctx.imageLoaded ? "hidden" : "block",
          className
        )}
        onLoad={(e) => {
          ctx?.setImageLoaded(true);
          onLoad?.(e);
        }}
        onError={(e) => {
          ctx?.setHasError(true);
          onError?.(e);
        }}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

export const AvatarFallback = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    const ctx = useContext(AvatarContext);

    if (ctx?.imageLoaded && !ctx.hasError) return null;

    return (
      <div
        ref={ref}
        className={cn(
          "flex size-full items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground select-none",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = "AvatarFallback";
