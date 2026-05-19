import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@symbiot/ui/components/Card";

import { type ViewerMode } from "../../shared/apiTypes.ts";

interface SubmittedScreenProps {
  mode: ViewerMode;
}

const headingFor = (mode: ViewerMode): string =>
  mode === "annotate" ? "Feedback submitted." : "Sent to the agent.";

/** Final screen shown after the reviewer's decision has been posted. */
export const SubmittedScreen = ({ mode }: SubmittedScreenProps): React.ReactElement => (
  <div data-testid="submitted-screen" className="flex h-full items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardHeader className="items-center text-center">
        <CheckCircle2 className="text-primary size-10" />
        <CardTitle className="text-lg">{headingFor(mode)}</CardTitle>
        <CardDescription>You can close this window.</CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  </div>
);
