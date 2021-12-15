import { useState } from "react";
import "./App.css";
import Header from "./components/UI/Header";
import Main from "./components/pages/Main";
import Settings from "./components/pages/Settings";
import Modal from "./components/UI/Modal";
import Footer from "./components/UI/Footer";

function App() {
  const [showModal, setShowModal] = useState(false);
  const [examName, setExamName] = useState("...");
  const [examPart, setExamPart] = useState("...");
  const [examTime, setExamTime] = useState("...");
  const [examTimeInMinutes, setExamTimeInMinutes] = useState(0);
  const [showTimer, setShowTimer] = useState(false);

  const hideModalHandler = () => {
    setShowModal(false);
  };
  const showModalHandler = () => {
    setShowModal(true);
  };

  const examNameHandler = (value) => {
    setExamName(value);
  };
  const examPartHandler = (value) => {
    setExamPart(value);
  };
  const examTimeHandler = (value) => {
    setExamTime(value);
  };
  const examTimeInMinutesHandler = (value) => {
    setExamTimeInMinutes(value);
  };
  const showTimerHandler = (value) => {
    setShowTimer(value);
  };

  return (
    <div className="App">
      <Modal showModal={showModal} click={hideModalHandler}>
        <Settings
          onExamName={examNameHandler}
          onExamPart={examPartHandler}
          onExamTime={examTimeHandler}
          onExamTimeInMinutes={examTimeInMinutesHandler}
          onShowTimer={showTimerHandler}
          onHideModal={hideModalHandler}
        />
      </Modal>
      <Header />
      <Main
        examName={examName}
        examPart={examPart}
        examTime={examTime}
        examTimeInMinutes={examTimeInMinutes}
        showTimer={showTimer}
      />
      <Footer click={showModalHandler} />
    </div>
  );
}

export default App;
