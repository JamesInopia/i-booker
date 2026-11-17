import { LoadingScreen } from "./components/loading-screen";

// Full screen "Connecting to iBooker...": shown on first load and after signing in, while
// the (app) layout checks the session.
export default function Loading() {
  return <LoadingScreen fullScreen />;
}
