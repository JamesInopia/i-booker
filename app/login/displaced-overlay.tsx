"use client";

import { useEffect, useState } from "react";
import { DISPLACED_MESSAGE, LoadingScreen } from "../components/loading-screen";

// Shown on the login page of a device that was signed out because the account logged in on
// another device. Rendered on the server too, so the login form never flashes first.
export function DisplacedOverlay() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return visible ? <LoadingScreen fullScreen message={DISPLACED_MESSAGE} /> : null;
}
