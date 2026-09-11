import { useEffect } from "react";

export function useUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      // preventDefault is the whole modern contract; returnValue is deprecated.
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [active]);
}
