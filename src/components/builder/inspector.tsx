"use client";

import dynamic from "next/dynamic";

const InspectorCanvas = dynamic(() => import("./scene/inspector-canvas"), {
  ssr: false,
});

export function Inspector() {
  return (
    <div className="h-dvh w-full bg-background">
      <InspectorCanvas />
    </div>
  );
}
