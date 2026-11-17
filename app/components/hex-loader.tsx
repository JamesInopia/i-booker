// Pure SVG + CSS (no hooks), so it can render from server components such as loading.tsx.
//
// The hexagon is a ring of 6 edges that tile exactly (mitred corners, no overlaps, so
// partially transparent edges never darken where they meet). A window of three edges is lit
// at 100% / 80% / 60% and sweeps clockwise; the keyframes in globals.css (`hex-edge`)
// interpolate between those steps, which keeps the motion smooth.

const R = 46; // outer radius of the ring (viewBox is 100 x 100)
const THICKNESS = 7;
const APOTHEM = R * Math.cos(Math.PI / 6);
const INNER_R = (APOTHEM - THICKNESS) / Math.cos(Math.PI / 6);

// Pointy-top hexagon (same orientation as the logo). Vertex 0 is at the top; indices go clockwise.
const vertex = (radius: number, k: number) => {
  const angle = ((-90 + 60 * k) * Math.PI) / 180;
  return `${(50 + radius * Math.cos(angle)).toFixed(2)},${(50 + radius * Math.sin(angle)).toFixed(2)}`;
};

const EDGES = Array.from({ length: 6 }, (_, i) =>
  [vertex(R, i), vertex(R, (i + 1) % 6), vertex(INNER_R, (i + 1) % 6), vertex(INNER_R, i)].join(" "),
);

export function HexLoader({ className = "h-14 w-14" }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className={`hex-loader text-accent-1 ${className}`}
      fill="currentColor"
    >
      {EDGES.map((points, i) => (
        <polygon key={i} points={points} className="hex-edge" style={{ "--i": i } as React.CSSProperties} />
      ))}
    </svg>
  );
}
