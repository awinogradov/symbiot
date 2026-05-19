interface LoadingFallbackProps {
  label: string;
}

/** Centered muted-text placeholder used while the plan or draft is loading. */
export const LoadingFallback = ({ label }: LoadingFallbackProps): React.ReactElement => (
  <div className="text-muted-foreground flex h-full items-center justify-center">{label}</div>
);
