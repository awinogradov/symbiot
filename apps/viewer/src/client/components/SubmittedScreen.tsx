import { type ViewerMode } from "../../shared/apiTypes.ts";

interface SubmittedScreenProps {
  mode: ViewerMode;
}

const headingFor = (mode: ViewerMode): string =>
  mode === "annotate" ? "Feedback submitted." : "Sent to the agent.";

/** Final screen shown after the reviewer's decision has been posted. */
export const SubmittedScreen = ({ mode }: SubmittedScreenProps): React.ReactElement => (
  <div
    data-testid="submitted-screen"
    className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 text-sm"
  >
    <p className="text-foreground text-lg font-medium">{headingFor(mode)}</p>
    <p>You can close this window.</p>
  </div>
);
