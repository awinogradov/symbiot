import { ThemeProvider } from "@symbiot/ui/components/ThemeProvider";

import { useLoadedPlan } from "../hooks/useLoadedPlan.ts";

import { DebugBar } from "./DebugBar.tsx";
import { LoadingFallback } from "./LoadingFallback.tsx";
import { PlanLoaded } from "./PlanLoaded.tsx";

/** Top-level shell: fetches the plan, hands off to `<PlanLoaded>`, and pins a build-info `<DebugBar>` for support. */
export const App = (): React.ReactElement => {
  const plan = useLoadedPlan();
  return (
    <ThemeProvider>
      {plan === null ? <LoadingFallback label="Loading plan…" /> : <PlanLoaded plan={plan} />}
      <DebugBar mode={plan?.mode} />
    </ThemeProvider>
  );
};
