import { RouteLoadingScreen } from "../components/loading-provider";

// Shown in the content area on page-to-page navigation, so the sidebar and header stay put.
// "Loading, please wait..." (see components/loading-screen.tsx).
export default function Loading() {
  return <RouteLoadingScreen />;
}
