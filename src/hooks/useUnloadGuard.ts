import { useEffect } from "react";

export function useUnloadGuard(active: boolean): void {
  useEffect(() => {
    if (!active) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [active]);
}
