import { useState } from "react";
import Header from "./components/UI/Header";
import Footer from "./components/UI/Footer";
import { Board } from "./components/Board";
import { BoardSettingsDialog } from "./components/BoardSettingsDialog";
import { SessionDialog } from "./components/SessionDialog";
import type { SessionDialogTarget } from "./components/SessionDialog";
import { useClockJump } from "./hooks/useClockJump";

const APP_CLASSES =
  "flex h-screen flex-col overflow-hidden bg-white text-linguaskill-slate-900";

const MAIN_CLASSES = "flex min-h-0 flex-1 flex-col px-6 pb-1 pt-2";

function App() {
  const [sessionDialogTarget, setSessionDialogTarget] = useState<SessionDialogTarget | null>(null);
  const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

  useClockJump();

  function handleAddSession() {
    setSessionDialogTarget({ kind: "add" });
  }

  function handleEditSession(sessionId: string) {
    setSessionDialogTarget({ kind: "edit", sessionId });
  }

  function handleCloseSessionDialog() {
    setSessionDialogTarget(null);
  }

  function handleOpenBoardSettings() {
    setBoardSettingsOpen(true);
  }

  function handleCloseBoardSettings() {
    setBoardSettingsOpen(false);
  }

  return (
    <div className={APP_CLASSES}>
      <Header />
      <main className={MAIN_CLASSES}>
        <Board
          onAddSession={handleAddSession}
          onEditSession={handleEditSession}
          onEditCentreNumber={handleOpenBoardSettings}
        />
      </main>
      <Footer />
      {sessionDialogTarget !== null && (
        <SessionDialog target={sessionDialogTarget} onClose={handleCloseSessionDialog} />
      )}
      {boardSettingsOpen && <BoardSettingsDialog onClose={handleCloseBoardSettings} />}
    </div>
  );
}

export default App;
