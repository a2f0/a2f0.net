import dynamic from "next/dynamic";

const Drive = dynamic(() => import("../src/DriveApp"), { ssr: false });
export default function Home() {
  return <Drive />;
}
