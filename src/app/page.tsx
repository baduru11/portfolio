"use client";

import dynamic from "next/dynamic";

// Scene uses WebGL — must not prerender on the server.
// ssr:false is only valid inside a client component in Next 16.
const Scene = dynamic(() => import("@/scene/Scene"), { ssr: false });

export default function Home() {
  return (
    <main className="fixed inset-0 bg-black overflow-hidden">
      <Scene />
    </main>
  );
}
