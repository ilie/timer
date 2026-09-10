import { useState, Fragment } from "react";
import Timer from "./Timer";

const Content = (props) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [reset, setReset] = useState(false);

  const playPauseHandler = () => {
    setIsPlaying((isPlaying) => !isPlaying);
  };

  const resetHandler = () => {
    setReset(true);
    setTimeout(() => {
      setReset(false);
    }, 100);
  };

  return (
    <div className="wrapper">
      <div className="content">
        <div className="lables">
          <p>Centre Number:</p>
          <p>Exam:</p>
          <p>Part:</p>
          <p>Time:</p>
          {props.showTimer && <p>Remaining Time:</p>}
        </div>
        <div className="values">
          <p>ES432</p>
          <p>{props.examName}</p>
          <p>{props.examPart}</p>
          <p>{props.examTime}</p>
          {props.showTimer && (
            <Timer
              isPlaying={isPlaying}
              minutes={props.examTimeInMinutes}
              examPart={props.examPart}
              reset={reset}
            />
          )}
        </div>
      </div>
      <div className="controls">
        {props.showTimer && (
          <Fragment>
            <button className="reset-btn" onClick={resetHandler}>
              Reset
            </button>
            <button className="play-btn" onClick={playPauseHandler}>
              {!isPlaying ? "Start" : "Pause"}
            </button>
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default Content;
