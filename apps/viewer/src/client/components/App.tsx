import { ThemeProvider } from "@symbiot/ui/components/ThemeProvider";

import { useLoadedPlan } from "../hooks/useLoadedPlan.ts";

import { LoadingFallback } from "./LoadingFallback.tsx";
import { PlanLoaded } from "./PlanLoaded.tsx";

/** Top-level shell: fetches the plan, then hands off to `<PlanLoaded>`. */
export const App = (): React.ReactElement => {
  const plan = useLoadedPlan();
  return (
    <ThemeProvider>
      {plan === null ? <LoadingFallback label="Loading plan…" /> : <PlanLoaded plan={plan} />}
    </ThemeProvider>
  );
};
