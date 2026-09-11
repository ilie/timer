import { useState } from 'react';
import type { ReactElement } from 'react';
import { Header } from './components/UI/Header';
import { Footer } from './components/UI/Footer';
import { Board } from './components/Board';
import { ClockAlert } from './components/ClockAlert';
import { BoardSettingsDialog } from './components/BoardSettingsDialog';
import { SessionDialog } from './components/SessionDialog';
import type { SessionDialogTarget } from './components/SessionDialog';
import { useClockJump } from './hooks/useClockJump';

export function App(): ReactElement {
    const [sessionDialogTarget, setSessionDialogTarget] = useState<SessionDialogTarget | null>(null);
    const [boardSettingsOpen, setBoardSettingsOpen] = useState(false);

    useClockJump();

    function showAddSessionDialog() {
        setSessionDialogTarget({ kind: 'add' });
    }

    function showEditSessionDialog(sessionId: string) {
        setSessionDialogTarget({ kind: 'edit', sessionId });
    }

    function closeSessionDialog() {
        setSessionDialogTarget(null);
    }

    function showBoardSettings() {
        setBoardSettingsOpen(true);
    }

    function closeBoardSettings() {
        setBoardSettingsOpen(false);
    }

    return (
        <div className="text-linguaskill-slate-900 flex h-screen flex-col overflow-hidden bg-white">
            <Header />
            <main className="flex min-h-0 flex-1 flex-col pt-2 pb-1">
                <ClockAlert />
                <Board
                    onAddSession={showAddSessionDialog}
                    onEditSession={showEditSessionDialog}
                    onEditCentreNumber={showBoardSettings}
                />
            </main>
            <Footer />
            {sessionDialogTarget !== null && (
                <SessionDialog target={sessionDialogTarget} onClose={closeSessionDialog} />
            )}
            {boardSettingsOpen && <BoardSettingsDialog onClose={closeBoardSettings} />}
        </div>
    );
}
