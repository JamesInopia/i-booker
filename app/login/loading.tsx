import { LoadingScreen, LOADING_MESSAGE } from "../components/loading-screen";

// The login page itself is not "connecting to iBooker" yet, so it gets the neutral message.
export default function Loading() {
  return <LoadingScreen fullScreen message={LOADING_MESSAGE} />;
}
