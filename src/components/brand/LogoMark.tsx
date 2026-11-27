import React from "react";

const LOGO_MARK_SRC = "/icons/logo_mark.svg";

export interface LogoMarkProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function LogoMark({
  size = 32,
  className = "",
  style,
  ...props
}: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="AbangCebu Logo Mark"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      {...props}
    >
      <title>AbangCebu Logo Mark</title>
      <image href={LOGO_MARK_SRC} width="512" height="512" />
    </svg>
  );
}

export default LogoMark;
