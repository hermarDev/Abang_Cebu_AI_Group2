import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "./Message";
import { Bubble, BubbleAttachments, BubbleContent, BubbleGroup, BubbleQuote, MessagePreviewContent, parseAttachmentPreview } from "./Bubble";
import { Marker, MarkerContent } from "./Marker";
import { MessageScroller } from "./MessageScroller";

describe("Avatar components", () => {
  it("renders avatar fallback with initials when static rendering", () => {
    const html = renderToStaticMarkup(
      <Avatar className="size-10">
        <AvatarImage src="/avatar.jpg" alt="User" />
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );

    expect(html).toContain("JD");
    expect(html).toContain("rounded-full");
  });
});

describe("Chat primitives", () => {
  it("renders outgoing message and bubble structure", () => {
    const html = renderToStaticMarkup(
      <Message mine>
        <MessageContent mine>
          <BubbleGroup>
            <Bubble mine>
              <BubbleContent>Hello landlord!</BubbleContent>
            </Bubble>
          </BubbleGroup>
          <MessageFooter>10:30 AM</MessageFooter>
        </MessageContent>
      </Message>
    );

    expect(html).toContain('data-mine="true"');
    expect(html).toContain("justify-end");
    expect(html).toContain("bg-action");
    expect(html).toContain("Hello landlord!");
    expect(html).toContain("10:30 AM");
  });

  it("renders incoming message with avatar", () => {
    const html = renderToStaticMarkup(
      <Message mine={false}>
        <MessageAvatar>
          <Avatar>
            <AvatarFallback>LL</AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent mine={false}>
          <BubbleGroup>
            <Bubble mine={false}>
              <BubbleContent>Yes, the unit is available.</BubbleContent>
            </Bubble>
          </BubbleGroup>
          <MessageFooter>10:32 AM</MessageFooter>
        </MessageContent>
      </Message>
    );

    expect(html).toContain('data-mine="false"');
    expect(html).toContain("justify-start");
    expect(html).toContain("bg-muted");
    expect(html).toContain("LL");
    expect(html).toContain("Yes, the unit is available.");
  });

  it("renders date marker", () => {
    const html = renderToStaticMarkup(
      <Marker>
        <MarkerContent>Today</MarkerContent>
      </Marker>
    );

    expect(html).toContain("<li");
    expect(html).toContain("Today");
    expect(html).toContain("rounded-full");
  });

  it("renders message scroller container", () => {
    const html = renderToStaticMarkup(
      <MessageScroller className="test-scroller">
        <p>Chat stream</p>
      </MessageScroller>
    );

    expect(html).toContain("test-scroller");
    expect(html).toContain("overflow-y-auto");
    expect(html).toContain("Chat stream");
  });

  it("renders quoted message block inside bubble", () => {
    const html = renderToStaticMarkup(
      <Bubble mine>
        <BubbleQuote author="abangcebu landlord" body="hi" mine />
        <BubbleContent>Hello! Is the property still available?</BubbleContent>
      </Bubble>
    );

    expect(html).toContain("abangcebu landlord");
    expect(html).toContain("hi");
    expect(html).toContain("Hello! Is the property still available?");
  });

  it("replaces emoji attachment indicators in BubbleQuote and MessagePreviewContent with Lucide icons", () => {
    const emptyQuote = renderToStaticMarkup(
      <Bubble mine={false}>
        <BubbleQuote author="Maria" body="" mine={false} />
      </Bubble>
    );
    expect(emptyQuote).toContain("lucide-image");
    expect(emptyQuote).toContain("Photo");
    expect(emptyQuote).not.toContain("📷");

    const emojiQuote = renderToStaticMarkup(
      <Bubble mine>
        <BubbleQuote author="Maria" body="📷 Photo" mine />
      </Bubble>
    );
    expect(emojiQuote).toContain("lucide-image");
    expect(emojiQuote).toContain("Photo");
    expect(emojiQuote).not.toContain("📷");

    const videoPreview = renderToStaticMarkup(
      <MessagePreviewContent text="" attachments={[{ mimeType: "video/mp4" }]} fallbackToAttachment />
    );
    expect(videoPreview).toContain("lucide-video");
    expect(videoPreview).toContain("Video");

    const voicePreview = renderToStaticMarkup(
      <MessagePreviewContent text="" attachments={[{ mimeType: "audio/ogg" }]} fallbackToAttachment />
    );
    expect(voicePreview).toContain("lucide-mic");
    expect(voicePreview).toContain("Voice message");

    const filePreview = renderToStaticMarkup(
      <MessagePreviewContent text="" attachments={[{ mimeType: "application/pdf" }]} fallbackToAttachment />
    );
    expect(filePreview).toContain("lucide-paperclip");
    expect(filePreview).toContain("Attachment");

    expect(parseAttachmentPreview("📷 Photo")).toEqual({ kind: "photo", text: "Photo" });
    expect(parseAttachmentPreview("🎥 Room tour")).toEqual({ kind: "video", text: "Room tour" });
    expect(parseAttachmentPreview("🎤 Voice message")).toEqual({ kind: "voice", text: "Voice message" });
    expect(parseAttachmentPreview("📎 lease.pdf")).toEqual({ kind: "file", text: "lease.pdf" });
    expect(parseAttachmentPreview("Is it still available?")).toEqual({ kind: null, text: "Is it still available?" });
  });

  it("renders message attachments grid with proper dimensions for single and multiple items", () => {
    const single = renderToStaticMarkup(
      <Bubble mine hasAttachmentOnly>
        <BubbleAttachments
          attachments={[
            { id: "att-1", url: "https://example.test/img1.jpg", fileName: "IMG_1.jpg", fileSize: 1000, mimeType: "image/jpeg" },
          ]}
        />
      </Bubble>
    );

    expect(single).toContain("grid-cols-1");
    expect(single).toContain("w-64 sm:w-72");
    expect(single).toContain("aspect-4/3 min-h-36");
    expect(single).toContain("p-0.5 overflow-hidden");

    const multi = renderToStaticMarkup(
      <Bubble mine={false}>
        <BubbleAttachments
          attachments={[
            { id: "att-1", url: "https://example.test/img1.jpg", fileName: "IMG_1.jpg", fileSize: 1000, mimeType: "image/jpeg" },
            { id: "att-2", url: "https://example.test/img2.jpg", fileName: "IMG_2.jpg", fileSize: 2000, mimeType: "image/jpeg" },
          ]}
        />
      </Bubble>
    );

    expect(multi).toContain("grid-cols-2");
    expect(multi).toContain("w-72 sm:w-80");
    expect(multi).toContain("aspect-square min-h-24");
    expect(multi).toContain("img1.jpg");
    expect(multi).toContain("img2.jpg");
  });
});
