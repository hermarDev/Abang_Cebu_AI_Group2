import React from "react";

const MAIN_LOGO_LIGHT_SRC = "/icons/main_logo.svg";
const MAIN_LOGO_DARK_SRC = "/icons/main_logo_dark.svg";

export interface BrandLogoProps extends React.SVGProps<SVGSVGElement> {
  theme?: "light" | "dark" | "auto";
  compact?: boolean;
}

export function BrandLogo({
  theme = "auto",
  className = "h-auto w-28 sm:w-32",
  style,
  ...props
}: BrandLogoProps) {
  return (
    <svg
      viewBox="0 0 720 240"
      role="img"
      aria-label="AbangCebu"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", ...style }}
      {...props}
    >
      <title>AbangCebu</title>
      {theme === "dark" ? (
        <image href={MAIN_LOGO_DARK_SRC} width="720" height="240" />
      ) : theme === "light" ? (
        <image href={MAIN_LOGO_LIGHT_SRC} width="720" height="240" />
      ) : (
        <>
          <image
            className="block dark:hidden"
            href={MAIN_LOGO_LIGHT_SRC}
            width="720"
            height="240"
          />
          <image
            className="hidden dark:block"
            href={MAIN_LOGO_DARK_SRC}
            width="720"
            height="240"
          />
        </>
      )}
    </svg>
  );
}

export default BrandLogo;
