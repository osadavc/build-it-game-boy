import { Suspense } from "react";
import { Inspector } from "@/components/builder/inspector";

/** Dev aid: /inspect?p=<part>&dir=x,y,z renders one part on its own. */
export default function InspectPage() {
  return (
    <Suspense>
      <Inspector />
    </Suspense>
  );
}
