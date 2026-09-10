import { useEffect, useState } from "react";
import { DISPLAY_TICK_MS } from "../config/timing";

export function useNow(): number {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
    }, DISPLAY_TICK_MS);
    return () => {
      clearInterval(tick);
    };
  }, []);

  return now;
}
