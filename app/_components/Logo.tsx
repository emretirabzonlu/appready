type LogoProps = {
  variant?: "full" | "mark";
  tone?: "dark" | "light";
  className?: string;
  alt?: string;
};

const SRC_MAP: Record<"full" | "mark", Record<"dark" | "light", string>> = {
  full: {
    dark: "/logos/logo-full-navy.svg",
    light: "/logos/logo-full-white.svg",
  },
  mark: {
    dark: "/logos/logo-mark-navy.svg",
    light: "/logos/logo-mark-white.svg",
  },
};

export default function Logo({
  variant = "full",
  tone = "dark",
  className,
  alt = "PortReady",
}: LogoProps) {
  return (
    <img
      src={SRC_MAP[variant][tone]}
      alt={alt}
      className={className}
    />
  );
}
