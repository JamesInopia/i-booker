"use client";

import { useEffect } from "react";

/**
 * Logos, room photos and icons can't be dragged out or copied with "Copy image" (right-click / long-press).
 * Selecting and copy-pasting them is blocked in CSS (see the img/svg rule in globals.css).
 * This can't stop screenshots or someone reading the page's network requests; it only removes the easy ways.
 */
export function ProtectMedia() {
  useEffect(() => {
    const isMedia = (t: EventTarget | null) => t instanceof Element && !!t.closest("img, svg");
    const block = (e: Event) => {
      if (isMedia(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}
