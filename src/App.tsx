import { useRef, useState } from "react";
import Header from "./components/UI/Header";
import Settings from "./components/pages/Settings";
import Modal from "./components/UI/Modal";
import Footer from "./components/UI/Footer";
import { Board } from "./components/Board";
import { useClockJump } from "./hooks/useClockJump";
import { exams } from "./config/exams";
import type { Mode } from "./config/exams";
import { reset } from "./lib/timer";
import { getSnapshot, setOnlySession } from "./store/boardStore";

const BRIDGED_SESSION_ID = "bridged-session";

const EXTRA_MINUTES = 0;

function App() {
  const [showModal, setShowModal] = useState(false);
  const chosenExamName = useRef("");
  const chosenMode = useRef<Mode>("paper");

  useClockJump();

  function handleHideModal() {
    setShowModal(false);
  }

  function handleShowModal() {
    setShowModal(true);
  }

  function handleExamType(value: string) {
    chosenMode.current = value === "CB" ? "digital" : "paper";
  }

  function handleExamName(value: string) {
    chosenExamName.current = value;
  }

  function handleExamPart(value: string) {
    const examName = chosenExamName.current;
    const exam = exams.find((candidate) => candidate.examName === examName);
    if (exam === undefined) {
      return;
    }
    const partIndex = exam.examParts.findIndex((part) => part.name === value);
    if (partIndex < 0) {
      return;
    }
    const mode = chosenMode.current;
    const current = getSnapshot().sessions.find((session) => session.id === BRIDGED_SESSION_ID);
    const sameConfiguration =
      current !== undefined &&
      current.examName === examName &&
      current.partIndex === partIndex &&
      current.mode === mode &&
      current.extraMinutes === EXTRA_MINUTES;
    setOnlySession({
      id: BRIDGED_SESSION_ID,
      examName,
      partIndex,
      mode,
      extraMinutes: EXTRA_MINUTES,
      timer: sameConfiguration ? current.timer : reset(),
    });
  }

  function ignoreSupersededFormValue() {}

  return (
    <div className="App">
      <Modal showModal={showModal} click={handleHideModal}>
        <Settings
          onExamType={handleExamType}
          onExamName={handleExamName}
          onExamPart={handleExamPart}
          onExamTime={ignoreSupersededFormValue}
          onExamTimeInMinutes={ignoreSupersededFormValue}
          onShowTimer={ignoreSupersededFormValue}
          onHideModal={handleHideModal}
        />
      </Modal>
      <Header />
      <main className="wrapper">
        <Board />
      </main>
      <Footer click={handleShowModal} examName="" />
    </div>
  );
}

export default App;
