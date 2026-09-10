import { useState, useEffect } from "react";

const Timer = (props) => {
  const [totalSeconds, setTotalSeconds] = useState(props.minutes * 60);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor((totalSeconds % 3600) % 60);
  const displayM = minutes < 10 ? "0" + minutes : minutes;
  const displayS = seconds < 10 ? "0" + seconds : seconds;

  let resetPerformed = false;

  useEffect(() => {
    // Set new Timer
    setTotalSeconds(props.minutes * 60);
    // Reset Timer
    if (!resetPerformed && props.reset) {
      resetPerformed = true;
      setTotalSeconds(props.minutes * 60);
    }
  }, [props.minutes, props.examPart, props.reset]);

  // We are using useEffect with no dependencies because we want it to run always
  useEffect(() => {
    const timer = setTimeout(() => {
      if (totalSeconds >= 1 && props.isPlaying) {
        setTotalSeconds((prevTotalSeconds) => prevTotalSeconds - 1);
      }
    }, 1000);
    return () => clearTimeout(timer);
  });

  return <p>{hours + "h  " + displayM + "min  " + displayS + "sec"}</p>;
};
export default Timer;
