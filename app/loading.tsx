import { LoadingScreen } from "./components/loading-screen";

// Shown while the app first loads and while the (app) layout checks the session.
export default function Loading() {
  return <LoadingScreen fullScreen />;
}
