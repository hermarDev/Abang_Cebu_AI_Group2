import { forwardRef, type HTMLAttributes } from "react";
import Image from "next/image";
import { CornerUpLeft, Image as ImageIcon } from "lucide-react";
import { cn } from "@/components/ui/cn";

export const BubbleGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1 w-full", className)} {...props}>
        {children}
      </div>
    );
  }
);
BubbleGroup.displayName = "BubbleGroup";

export interface BubbleProps extends HTMLAttributes<HTMLDivElement> {
  mine?: boolean;
}

export const Bubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, mine = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-mine={mine ? "true" : "false"}
        className={cn(
          "rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
          mine
            ? "bg-action text-action-foreground rounded-br-xs"
            : "bg-muted text-foreground rounded-bl-xs",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Bubble.displayName = "Bubble";

export interface BubbleQuoteProps extends HTMLAttributes<HTMLDivElement> {
  author: string;
  body: string;
  mine?: boolean;
  isUnavailable?: boolean;
  onJump?: () => void;
}

export function BubbleQuote({
  author,
  body,
  mine = false,
  isUnavailable = false,
  onJump,
  className,
  ...props
}: BubbleQuoteProps) {
  return (
    <div
      role={onJump ? "button" : undefined}
      tabIndex={onJump ? 0 : undefined}
      onClick={onJump}
      onKeyDown={(e) => {
        if (onJump && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onJump();
        }
      }}
      aria-label={isUnavailable ? "Quoted message unavailable" : `Jump to quoted message from ${author}`}
      className={cn(
        "mb-1.5 flex flex-col gap-0.5 rounded-lg border-l-3 px-2 py-1 text-xs text-left transition-opacity",
        mine
          ? "border-action-foreground/80 bg-black/20 text-action-foreground/90 hover:opacity-90"
          : "border-action bg-card/70 text-card-foreground hover:opacity-90",
        onJump && "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-1 font-semibold text-[0.7rem] opacity-90">
        <CornerUpLeft size={11} className="shrink-0" aria-hidden="true" />
        <span className="truncate">{author}</span>
      </div>
      <p className="line-clamp-2 m-0 text-[0.75rem] opacity-85 break-words">
        {isUnavailable ? "Original message unavailable" : body || "📷 Photo"}
      </p>
    </div>
  );
}

export interface BubbleAttachmentsProps extends HTMLAttributes<HTMLDivElement> {
  attachments: {
    id?: string;
    url?: string | null;
    fileName: string;
    fileSize?: number;
    mimeType?: string;
  }[];
  onPhotoClick?: (index: number) => void;
}

export function BubbleAttachments({
  attachments,
  onPhotoClick,
  className,
  ...props
}: BubbleAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  const count = attachments.length;
  return (
    <div
      className={cn(
        "grid gap-1.5 my-1 overflow-hidden rounded-xl",
        count === 1 && "grid-cols-1 max-w-xs",
        count === 2 && "grid-cols-2 max-w-sm",
        count >= 3 && "grid-cols-2 max-w-sm",
        className
      )}
      {...props}
    >
      {attachments.map((att, index) => {
        const url = att.url;
        return (
          <button
            key={att.id ?? att.fileName + index}
            type="button"
            onClick={() => onPhotoClick?.(index)}
            className="group relative block aspect-4/3 w-full overflow-hidden rounded-lg bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer"
            aria-label={`View full photo: ${att.fileName}`}
          >
            {url ? (
              <Image
                src={url}
                alt={att.fileName}
                fill
                sizes="(max-width: 640px) 100vw, 320px"
                unoptimized
                className="object-cover transition-transform duration-200 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageIcon size={20} aria-hidden="true" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const BubbleContent = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <p ref={ref} className={cn("whitespace-pre-wrap break-words m-0", className)} {...props}>
        {children}
      </p>
    );
  }
);
BubbleContent.displayName = "BubbleContent";
