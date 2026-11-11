import { forwardRef, type HTMLAttributes } from "react";
import Image from "next/image";
import { CornerUpLeft, Image as ImageIcon, Mic, Paperclip, Video } from "lucide-react";
import { cn } from "@/components/ui/cn";

export type AttachmentPreviewKind = "photo" | "video" | "voice" | "file";

export interface ParsedAttachmentPreview {
  kind: AttachmentPreviewKind | null;
  text: string;
}

const ATTACHMENT_ICONS: Record<AttachmentPreviewKind, typeof ImageIcon> = {
  photo: ImageIcon,
  video: Video,
  voice: Mic,
  file: Paperclip,
};

const ATTACHMENT_LABELS: Record<AttachmentPreviewKind, string> = {
  photo: "Photo",
  video: "Video",
  voice: "Voice message",
  file: "Attachment",
};

export function attachmentKindFromMime(mimeType?: string | null): AttachmentPreviewKind {
  const normalized = mimeType?.trim().toLowerCase() ?? "";
  if (normalized.startsWith("image/")) return "photo";
  if (normalized.startsWith("video/")) return "video";
  if (normalized.startsWith("audio/")) return "voice";
  return normalized ? "file" : "photo";
}

export function attachmentPreviewLabel(attachments?: { mimeType?: string | null }[] | null): string {
  return ATTACHMENT_LABELS[attachmentKindFromMime(attachments?.[0]?.mimeType)];
}

export function parseAttachmentPreview(
  rawText?: string | null,
  attachments?: { mimeType?: string | null }[] | null,
  fallbackToAttachment = false
): ParsedAttachmentPreview {
  const trimmed = rawText?.trim() ?? "";
  if (trimmed) {
    const photoMatch = trimmed.match(/^(?:📷|🖼️?|📸)\s*(.*)$/u);
    if (photoMatch) return { kind: "photo", text: photoMatch[1].trim() || "Photo" };

    const videoMatch = trimmed.match(/^(?:🎥|📹|🎬|🎞️?)\s*(.*)$/u);
    if (videoMatch) return { kind: "video", text: videoMatch[1].trim() || "Video" };

    const voiceMatch = trimmed.match(/^(?:🎤|🎙️?|🎧|🔊)\s*(.*)$/u);
    if (voiceMatch) return { kind: "voice", text: voiceMatch[1].trim() || "Voice message" };

    const fileMatch = trimmed.match(/^(?:📎|📄|📁|🗂️?)\s*(.*)$/u);
    if (fileMatch) return { kind: "file", text: fileMatch[1].trim() || "Attachment" };

    if (trimmed === "Photo") return { kind: "photo", text: "Photo" };
    if (trimmed === "Video") return { kind: "video", text: "Video" };
    if (trimmed === "Voice message") return { kind: "voice", text: "Voice message" };
    if (trimmed === "Attachment") return { kind: "file", text: "Attachment" };

    return { kind: null, text: rawText ?? "" };
  }

  if (attachments && attachments.length > 0) {
    const kind = attachmentKindFromMime(attachments[0]?.mimeType);
    return { kind, text: ATTACHMENT_LABELS[kind] };
  }

  if (fallbackToAttachment) {
    return { kind: "photo", text: "Photo" };
  }

  return { kind: null, text: "No messages yet" };
}

export function MessagePreviewContent({
  text,
  attachments,
  fallbackToAttachment = false,
  iconClassName,
}: {
  text?: string | null;
  attachments?: { mimeType?: string | null }[] | null;
  fallbackToAttachment?: boolean;
  iconClassName?: string;
}) {
  const parsed = parseAttachmentPreview(text, attachments, fallbackToAttachment);
  if (!parsed.kind) {
    return <span className="truncate">{parsed.text}</span>;
  }
  const Icon = ATTACHMENT_ICONS[parsed.kind];
  return (
    <>
      <Icon
        size={14}
        strokeWidth={2}
        className={cn("shrink-0 text-muted-foreground", iconClassName)}
        aria-hidden="true"
      />
      <span className="truncate">{parsed.text}</span>
    </>
  );
}

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
  hasAttachmentOnly?: boolean;
}

export const Bubble = forwardRef<HTMLDivElement, BubbleProps>(
  ({ className, mine = false, hasAttachmentOnly = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        data-mine={mine ? "true" : "false"}
        className={cn(
          "rounded-2xl text-sm leading-relaxed",
          hasAttachmentOnly
            ? "p-0.5 overflow-hidden bg-action/15 border border-action/30"
            : cn(
                "px-3.5 py-2",
                mine
                  ? "bg-action text-action-foreground rounded-br-xs"
                  : "bg-muted text-foreground rounded-bl-xs"
              ),
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
  attachments?: { mimeType?: string | null }[] | null;
  mine?: boolean;
  isUnavailable?: boolean;
  onJump?: () => void;
}

export function BubbleQuote({
  author,
  body,
  attachments,
  mine = false,
  isUnavailable = false,
  onJump,
  className,
  ...props
}: BubbleQuoteProps) {
  const parsed = isUnavailable ? null : parseAttachmentPreview(body, attachments, true);
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
          ? "border-white/80 bg-black/25 text-white hover:opacity-95"
          : "border-action bg-card/70 text-card-foreground hover:opacity-90",
        onJump && "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring",
        className
      )}
      {...props}
    >
      <div className={cn("flex items-center gap-1 font-semibold text-[0.7rem]", mine ? "text-blue-100" : "text-action")}>
        <CornerUpLeft size={11} className="shrink-0" aria-hidden="true" />
        <span className="truncate">{author}</span>
      </div>
      {isUnavailable ? (
        <p className="line-clamp-2 m-0 text-[0.75rem] opacity-90 break-words">Original message unavailable</p>
      ) : parsed?.kind ? (
        <p className="m-0 flex min-w-0 items-center gap-1.5 text-[0.75rem] opacity-90">
          <MessagePreviewContent
            text={body}
            attachments={attachments}
            fallbackToAttachment
            iconClassName={mine ? "text-white/80" : "text-muted-foreground"}
          />
        </p>
      ) : (
        <p className="line-clamp-2 m-0 text-[0.75rem] opacity-90 break-words">{parsed?.text}</p>
      )}
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
        "grid gap-1.5 my-0.5 overflow-hidden rounded-xl",
        count === 1 && "grid-cols-1 w-64 sm:w-72 max-w-full",
        count === 2 && "grid-cols-2 w-72 sm:w-80 max-w-full",
        count >= 3 && "grid-cols-2 w-72 sm:w-80 max-w-full",
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
            className={cn(
              "group relative block w-full overflow-hidden rounded-lg bg-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring cursor-pointer",
              count === 1 ? "aspect-4/3 min-h-36" : "aspect-square min-h-24"
            )}
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
              <div className="flex h-full w-full min-h-36 items-center justify-center text-muted-foreground">
                <ImageIcon size={22} aria-hidden="true" />
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
