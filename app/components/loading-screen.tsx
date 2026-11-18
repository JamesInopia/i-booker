import { HexLoader } from "./hex-loader";

export const CONNECTING_MESSAGE = "Connecting to iBooker...";
export const LOADING_MESSAGE = "Loading, please wait...";
export const DISPLACED_MESSAGE = "Logging in with different device";

/**
 * Hexagon loader + message on the app background.
 * - `fullScreen`: whole viewport, no sidebar/header ("Connecting to iBooker...", login -> app).
 * - default: covers only the content area, so the sidebar and header stay visible
 *   ("Loading, please wait...", in-between processes).
 */
export function LoadingScreen({
  fullScreen = false,
  message = fullScreen ? CONNECTING_MESSAGE : LOADING_MESSAGE,
}: {
  fullScreen?: boolean;
  message?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`${fullScreen ? "loading-fullscreen" : "loading-content"} flex flex-col items-center justify-center gap-3 bg-background`}
    >
      <HexLoader />
      <p className="text-lg font-bold text-black">{message}</p>
    </div>
  );
}
