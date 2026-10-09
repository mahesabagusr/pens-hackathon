import Image from "next/image";

// Brand lockup: the "d." app icon (public/logo-icon.png, cropped from public/icon.png) beside the wordmark.
// The icon tile is nearly the panel color, so a 1px ring keeps its rounded shape visible on dark backgrounds.
const SIZE = {
  sm: { icon: "size-6", word: "h-4" },
  md: { icon: "size-7", word: "h-5" },
  lg: { icon: "size-8", word: "h-6" },
};

export function Logo({ size = "md", priority = false }: { size?: keyof typeof SIZE; priority?: boolean }) {
  const s = SIZE[size];
  return (
    <span className="flex items-center gap-2">
      <Image src="/logo-icon.png" width={256} height={256} alt="" priority={priority} className={`${s.icon} rounded-[22%] ring-1 ring-line`} />
      <Image src="/logo-wordmark.png" width={1046} height={263} alt="Decidely" priority={priority} className={`${s.word} w-auto`} />
    </span>
  );
}
