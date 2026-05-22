import { Skeleton } from "@symbiot/ui/components/Skeleton";

/** Props for the loading placeholder used while plan / draft requests are in flight. */
interface LoadingFallbackProps {
  /** Screen-reader-only label describing what is loading. */
  label: string;
}

/** Skeleton placeholder used while the plan or draft is loading. */
export const LoadingFallback = ({ label }: LoadingFallbackProps): React.ReactElement => (
  <div className="mx-auto flex h-full max-w-3xl flex-col justify-center gap-3 px-8 py-6">
    <span className="sr-only">{label}</span>
    <Skeleton className="h-6 w-3/4" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-5/6" />
    <Skeleton className="h-4 w-2/3" />
    <Skeleton className="mt-4 h-32 w-full" />
  </div>
);
