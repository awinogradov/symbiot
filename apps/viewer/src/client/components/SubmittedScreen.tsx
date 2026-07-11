import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@symbiot/ui/components/Card";

import { type ViewerMode } from "../../shared/apiTypes.ts";

/** Props for the post-submit confirmation screen. */
interface SubmittedScreenProps {
  /** Viewer mode — drives whether the heading reads "feedback submitted" or "sent to the agent". */
  mode: ViewerMode;
  /** Draft mode only: distinguishes a sent revision from an approved plan. */
  draftOutcome?: "sent" | "approved";
}

const headingFor = (mode: ViewerMode, draftOutcome?: "sent" | "approved"): string => {
  if (mode === "draft") {
    return draftOutcome === "approved"
      ? "Plan approved — handed to the agent."
      : "Draft sent to the agent.";
  }
  return mode === "annotate" ? "Feedback submitted." : "Sent to the agent.";
};

/** Final screen shown after the reviewer's decision has been posted. */
export const SubmittedScreen = ({
  mode,
  draftOutcome,
}: SubmittedScreenProps): React.ReactElement => (
  <div data-testid="submitted-screen" className="flex h-full items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="text-primary size-10" />
        <CardTitle className="text-lg">{headingFor(mode, draftOutcome)}</CardTitle>
        <CardDescription>You can close this window.</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  </div>
);
