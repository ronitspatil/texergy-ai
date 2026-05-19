import { Suspense } from "react";
import { RecommendWizard } from "@/components/find/recommend-wizard";

export const metadata = {
  title: "Match | Texergy AI",
};

export default function RecommendPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Suspense fallback={null}>
        <RecommendWizard />
      </Suspense>
    </main>
  );
}
