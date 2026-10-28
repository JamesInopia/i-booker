"use client";

import { useEffect, useState } from "react";

const COUNT = 3;
const EXT = "jpg";
const INTERVAL_MS = 4000;

export function LoginCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % COUNT), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 select-none">
      {Array.from({ length: COUNT }, (_, i) => (
        <div
          key={i}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1500 ${
            i === index ? "opacity-20" : "opacity-0"
          }`}
          style={{
            backgroundImage: `url("/carousel/${encodeURIComponent(`[${i + 1}]`)}.${EXT}")`,
          }}
        />
      ))}
    </div>
  );
}