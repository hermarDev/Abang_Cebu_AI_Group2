import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/Avatar";
import { Message, MessageAvatar, MessageContent, MessageFooter } from "./Message";
import { Bubble, BubbleContent, BubbleGroup } from "./Bubble";
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

    expect(html).toContain('role="separator"');
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
});
