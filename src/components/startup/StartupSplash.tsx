import Image from "next/image";

export default function StartupSplash() {
  return (
    <div data-startup-splash="true" aria-hidden="false">
      <span role="status">Loading AbangCebu…</span>
      <Image src="/icons/main_Logo.png" alt="" width={299} height={100} unoptimized />
      <Image src="/icons/main_Logo_Light.png" alt="" width={299} height={100} unoptimized />
    </div>
  );
}
