import { useRef, useState, useSyncExternalStore } from "react";
import Header from "./components/UI/Header";
import Settings from "./components/pages/Settings";
import Modal from "./components/UI/Modal";
import Footer from "./components/UI/Footer";
import { SessionColumn } from "./components/SessionColumn";
import { useClockJump } from "./hooks/useClockJump";
import { exams } from "./config/exams";
import type { Mode } from "./config/exams";
import { densityFor } from "./lib/format";
import { reset } from "./lib/timer";
import { getSnapshot, setOnlySession, subscribe } from "./store/boardStore";

const BRIDGED_SESSION_ID = "bridged-session";

function selectedMode(): Mode {
  return sessionStorage.getItem("examType") === "CB" ? "digital" : "paper";
}

function App() {
  const board = useSyncExternalStore(subscribe, getSnapshot);
  const [showModal, setShowModal] = useState(false);
  const chosenExamName = useRef("");

  useClockJump();

  const session = board.sessions[0];
  const density = densityFor(board.sessions.length);

  function handleHideModal() {
    setShowModal(false);
  }

  function handleShowModal() {
    setShowModal(true);
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
    setOnlySession({
      id: BRIDGED_SESSION_ID,
      examName,
      partIndex,
      mode: selectedMode(),
      extraMinutes: 0,
      timer: reset(),
    });
  }

  function ignoreSupersededFormValue() {}

  function handleThresholdCross() {}

  return (
    <div className="App">
      <Modal showModal={showModal} click={handleHideModal}>
        <Settings
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
        <p className="centre-number">Centre no: {board.centreNumber}</p>
        {session === undefined ? (
          <p className="session-column">No exam selected yet.</p>
        ) : (
          <SessionColumn
            session={session}
            density={density}
            onThresholdCross={handleThresholdCross}
          />
        )}
      </main>
      <Footer click={handleShowModal} examName="" />
    </div>
  );
}

export default App;
