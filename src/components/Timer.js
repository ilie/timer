import { useState, Fragment } from "react";

const Timer = () => {
  const [allowedHours, setAllowedHours] = useState(1);
  const [allowedMinutes, setAllowedMinutes] = useState(20);
  const [allowedSeconds, setAllowedSeconds] = useState(0);

  const startTimerHandler = () => {};

  return (
    <Fragment>
      <h1>Remaining time</h1>
      <div className="timer">
        <div className="hour element">{allowedHours}</div>
        <span className="separator">:</span>
        <div className="minute element">{allowedMinutes}</div>
        <span className="separator">:</span>
        <div className="second element">{allowedSeconds}</div>
      </div>
    </Fragment>
  );
};
export default Timer;
