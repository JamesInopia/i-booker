"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

export function FitText({
  children,
  max = 16,
  min = 9,
}: {
  children: ReactNode;
  max?: number;
  min?: number;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!box || !text) return;

    const overflows = () =>
      text.scrollWidth > text.clientWidth + 1 ||
      text.scrollHeight > box.clientHeight + 1;
    const fit = () => {
      text.style.overflowWrap = "normal";
      let size = max;
      text.style.fontSize = `${size}px`;
      while (size > min && overflows()) {
        size -= 0.5;
        text.style.fontSize = `${size}px`;
      }
      if (text.scrollWidth > text.clientWidth + 1)
        text.style.overflowWrap = "anywhere";
    };
    fit();

    const observer = new ResizeObserver(fit);
    observer.observe(box);
    void document.fonts?.ready.then(fit);
    return () => observer.disconnect();
  }, [children, max, min]);

  return (
    <div
      ref={boxRef}
      className="absolute inset-x-1 inset-y-1 flex items-center justify-center overflow-hidden px-1"
    >
      <div
        ref={textRef}
        className="w-full text-center leading-tight"
        style={{ fontSize: max }}
      >
        {children}
      </div>
    </div>
  );
}
