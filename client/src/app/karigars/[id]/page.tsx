import { Suspense } from "react";
import KarigarDetailContent from "./karigar-detail-content";

export default function KarigarDetailPage() {
  return (
    <Suspense fallback={null}>
      <KarigarDetailContent />
    </Suspense>
  );
}
