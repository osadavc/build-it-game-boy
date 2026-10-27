// biome-ignore-all lint/a11y/noSvgWithoutTitle: decorative icons, always aria-hidden
import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

const base = {
  width: 20,
  height: 20,
  viewBox: "0 0 20 20",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

/** Three offset wings, the way a real tri-wing recess looks. */
export const TriWingIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="10" cy="10" r="7.25" />
    {[0, 120, 240].map((a) => (
      <path
        key={a}
        d="M10.6 10.2 10.9 4.6"
        transform={`rotate(${a} 10 10)`}
        strokeWidth={2.1}
      />
    ))}
  </svg>
);

export const PhillipsIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="10" cy="10" r="7.25" />
    <path d="M10 5.4v9.2M5.4 10h9.2" strokeWidth={2} />
  </svg>
);

export const SpudgerIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4.2 15.8 9.6-9.6 2.3-1.1-1.1 2.3-9.6 9.6a.9.9 0 0 1-1.2 0 .9.9 0 0 1 0-1.2Z" />
  </svg>
);

export const FrameIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M3.5 7V4.8c0-.7.6-1.3 1.3-1.3H7M13 3.5h2.2c.7 0 1.3.6 1.3 1.3V7M16.5 13v2.2c0 .7-.6 1.3-1.3 1.3H13M7 16.5H4.8c-.7 0-1.3-.6-1.3-1.3V13" />
    <circle cx="10" cy="10" r="1.6" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m5.5 5.5 9 9M14.5 5.5l-9 9" />
  </svg>
);

export const SearchIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="9" cy="9" r="5.25" />
    <path d="m13 13 3.5 3.5" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M10 4.5v11M4.5 10h11" />
  </svg>
);

export const MinusIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4.5 10h11" />
  </svg>
);

export const SoundIcon = ({ muted, ...p }: P & { muted?: boolean }) => (
  <svg {...base} {...p}>
    <path d="M3.5 8v4h3l4 3.5v-11l-4 3.5z" />
    {muted ? (
      <path d="m13.5 8 4 4m0-4-4 4" />
    ) : (
      <path d="M13.5 7.5a3.5 3.5 0 0 1 0 5M15.5 5.5a6.4 6.4 0 0 1 0 9" />
    )}
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="m4.5 10.5 3.5 3.5 7.5-8" />
  </svg>
);

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 26" className={className} aria-hidden>
      <path d="M1 1h16v17.6A6.4 6.4 0 0 1 10.6 25H1z" fill="currentColor" />
      <rect
        x="3.2"
        y="3.2"
        width="11.6"
        height="8.6"
        rx=".8"
        fill="var(--stage)"
      />
      <circle cx="12.6" cy="17.2" r="1.25" fill="var(--stage)" />
      <circle cx="10.2" cy="18.6" r="1.25" fill="var(--stage)" />
      <path
        d="M4.2 17.8h3.4M5.9 16.1v3.4"
        stroke="var(--stage)"
        strokeWidth="1.3"
      />
    </svg>
  );
}
