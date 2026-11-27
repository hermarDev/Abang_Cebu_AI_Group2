import React from "react";

const CHATBOT_LOGO_SRC = "/icons/chatbot_logo.svg";

export interface ChatbotAvatarProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function ChatbotAvatar({
  size = 48,
  className = "",
  style,
  ...props
}: ChatbotAvatarProps) {
  return (
    <svg
      viewBox="0 0 300 300"
      width={size}
      height={size}
      role="img"
      aria-label="AbangCebu Rental Assistant"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      {...props}
    >
      <title>AbangCebu Rental Assistant</title>
      <image href={CHATBOT_LOGO_SRC} width="300" height="300" />
    </svg>
  );
}

export default ChatbotAvatar;
