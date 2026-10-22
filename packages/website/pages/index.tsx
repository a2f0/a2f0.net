import dynamic from "next/dynamic";

// The window layer measures its container and listens to document mouse
// events, so the desktop renders only in the browser.
const Desktop = dynamic(() => import("../components/Desktop"), { ssr: false });

export default function Home() {
  return <Desktop />;
}
