import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board";
import { MAX_SESSIONS } from "../config/board";
import { STORAGE_KEY } from "../config/storage";
import { getSnapshot, hydrateFromStorage } from "../store/boardStore";

const EXAM_START = new Date("2026-06-11T09:00:00.000Z");

const paperSession = (id: string, examName: string, partIndex: number) => ({
  id,
  examName,
  partIndex,
  mode: "paper",
  extraMinutes: 0,
  timer: { status: "idle" },
});

const seed = (sessions: readonly unknown[]): void => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      centreNumber: "ES432",
      sessions,
      break: { timer: { status: "idle" }, minutes: 15 },
    }),
  );
  hydrateFromStorage();
};

const rowOf = (label: string): HTMLElement => {
  const row = screen.getByRole("rowheader", { name: label }).parentElement;
  if (row === null) {
    throw new Error(`No row labelled ${label}`);
  }
  return row;
};

const requestAddSession = vi.fn();

const requestEditSession = vi.fn();

const requestEditCentreNumber = vi.fn();

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
  requestAddSession.mockClear();
  requestEditSession.mockClear();
  requestEditCentreNumber.mockClear();
  vi.useFakeTimers();
  vi.setSystemTime(EXAM_START);
  localStorage.clear();
  hydrateFromStorage();
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("board grid", () => {
  it("names every row once and shows one centre number across four sessions", () => {
    seed([
      paperSession("one", "B2 First", 0),
      paperSession("two", "C1 Advanced", 0),
      paperSession("three", "A2 Key", 0),
      paperSession("four", "B1 Preliminary", 1),
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.getAllByText(/Centre no:/)).toHaveLength(1);
    expect(screen.getAllByRole("columnheader")).toHaveLength(4);
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Exam",
      "Part",
      "Time",
      "Remaining",
      "Controls",
    ]);
  });

  it("asks for a configuration instead of inventing one when a session is added", () => {
    seed([
      paperSession("one", "B2 First", 0),
      paperSession("two", "C1 Advanced", 0),
      paperSession("three", "A2 Key", 0),
    ]);

    const { unmount } = render(
      <Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />,
    );
    const addButton = screen.getByRole("button", { name: "Add Session" });

    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);

    expect(requestAddSession).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("columnheader")).toHaveLength(3);
    unmount();

    seed([
      paperSession("one", "B2 First", 0),
      paperSession("two", "C1 Advanced", 0),
      paperSession("three", "A2 Key", 0),
      paperSession("four", "B1 Preliminary", 0),
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(MAX_SESSIONS);
    expect(screen.getByRole("button", { name: "Add Session" })).toBeDisabled();
  });

  it("asks to configure the session whose tab is clicked", () => {
    seed([paperSession("one", "B2 First", 0), paperSession("two", "C1 Advanced", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Configure C1 Advanced" }));

    expect(requestEditSession).toHaveBeenCalledWith("two");
  });

  it("removes a session from its tab without asking to configure it", () => {
    seed([paperSession("one", "B2 First", 0), paperSession("two", "C1 Advanced", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove B2 First" }));

    expect(requestEditSession).not.toHaveBeenCalled();
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
  });

  it("drops the shared label column once a second session joins", () => {
    seed([paperSession("one", "B2 First", 0)]);

    const { unmount } = render(
      <Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />,
    );

    expect(screen.getByRole("rowheader", { name: "Remaining" })).toBeVisible();
    unmount();

    seed([paperSession("one", "B2 First", 0), paperSession("two", "C1 Advanced", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Exam",
      "Part",
      "Time",
      "Remaining",
      "Controls",
    ]);
    expect(screen.getAllByText("Remaining")).toHaveLength(3);
  });

  it("removes the session its remove button names", () => {
    seed([paperSession("one", "B2 First", 0), paperSession("two", "C1 Advanced", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove B2 First" }));

    expect(screen.queryByText("B2 First")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
    expect(within(rowOf("Exam")).getByText("C1 Advanced")).toBeInTheDocument();
  });

  it("gives a digital session no controls", () => {
    seed([{ ...paperSession("one", "B2 First", 0), mode: "digital" }]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
  });

  it("leaves a column with no countdown genuinely empty and merges its two rows", () => {
    seed([
      { ...paperSession("digital", "B2 First", 0), mode: "digital" },
      paperSession("listening", "B2 First", 2),
      paperSession("paper", "C1 Advanced", 0),
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(within(rowOf("Remaining")).getAllByRole("cell")).toHaveLength(3);
    expect(within(rowOf("Controls")).getAllByRole("cell")).toHaveLength(1);

    const merged = within(rowOf("Remaining"))
      .getAllByRole("cell")
      .filter((cell) => cell.getAttribute("rowspan") === "2");
    expect(merged).toHaveLength(2);
    for (const cell of merged) {
      expect(cell).toBeEmptyDOMElement();
    }
    expect(screen.getAllByRole("rowheader").map((cell) => cell.textContent)).toEqual([
      "Exam",
      "Part",
      "Time",
      "Remaining",
      "Controls",
    ]);
  });

});

describe("destructive confirmations", () => {
  const runningSession = (id: string, examName: string, endsInMs: number) => ({
    ...paperSession(id, examName, 0),
    timer: { status: "running", endsAt: EXAM_START.getTime() + endsInMs },
  });

  it("closes an idle session at once and asks before closing a running one", () => {
    seed([paperSession("one", "B2 First", 0), runningSession("two", "C1 Advanced", 30 * 60_000)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove B2 First" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Remove C1 Advanced" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader")).toHaveLength(1);
  });

  it("keeps the session when the close confirmation is cancelled", () => {
    seed([runningSession("one", "B2 First", 30 * 60_000)]);
    const before = JSON.stringify(getSnapshot().sessions);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove B2 First" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(JSON.stringify(getSnapshot().sessions)).toBe(before);
  });

  it("removes the session once the close is confirmed", () => {
    seed([runningSession("one", "B2 First", 30 * 60_000)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove B2 First" }));

    expect(screen.getByText(/still has/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close Session" }));

    expect(getSnapshot().sessions).toHaveLength(0);
  });

  it("resets an idle session at once and asks before resetting a running one", () => {
    seed([runningSession("one", "B2 First", 30 * 60_000)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(getSnapshot().sessions[0]?.timer).toMatchObject({ status: "running" });

    fireEvent.click(screen.getByRole("button", { name: "Reset Countdown" }));

    expect(getSnapshot().sessions[0]?.timer).toEqual({ status: "idle" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("resets without a prompt when nothing is running", () => {
    seed([paperSession("one", "B2 First", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    advance(75 * 60_000);
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(getSnapshot().sessions[0]?.timer).toEqual({ status: "idle" });
  });
});

describe("component advance", () => {
  it("offers the next component on its own when the running component ends", () => {
    seed([
      {
        ...paperSession("one", "B2 First", 0),
        timer: { status: "running", endsAt: EXAM_START.getTime() + 2000 },
      },
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next: Writing" })).not.toBeInTheDocument();

    advance(2000);

    expect(screen.getByRole("button", { name: "Next: Writing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("reaches the finished state from a started run with no further interaction", () => {
    seed([paperSession("one", "Pre A1 Starters", 0)]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    advance(20 * 60_000);

    expect(screen.getByRole("button", { name: "Next: Listening" })).toBeInTheDocument();
  });

  it("moves to the next component idle when the advance button is pressed", () => {
    seed([
      {
        ...paperSession("one", "B2 First", 0),
        timer: { status: "running", endsAt: EXAM_START.getTime() + 2000 },
      },
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);
    advance(2000);
    fireEvent.click(screen.getByRole("button", { name: "Next: Writing" }));

    expect(within(rowOf("Part")).getByText("Writing")).toBeInTheDocument();
    expect(within(rowOf("Time")).getByText("1h 20min")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
  });
  it("switches every column to short names at the compact threshold", () => {
    seed([
      paperSession("one", "B1 Preliminary", 0),
      { ...paperSession("two", "B2 First", 0), mode: "digital" },
    ]);

    const { unmount } = render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(document.querySelectorAll("[data-density]")).toHaveLength(1);
    expect(within(rowOf("Exam")).getByText("B1 Preliminary")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("B2 First")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getAllByRole("img", { name: "Digital" })).toHaveLength(1);
    unmount();

    seed([
      paperSession("one", "B1 Preliminary", 0),
      { ...paperSession("two", "B2 First", 0), mode: "digital" },
      { ...paperSession("three", "Linguaskill General", 0), mode: "digital" },
    ]);

    render(<Board onAddSession={requestAddSession} onEditSession={requestEditSession} onEditCentreNumber={requestEditCentreNumber} />);

    expect(document.querySelectorAll("[data-density]")).toHaveLength(1);
    expect(within(rowOf("Exam")).getByText("B1")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("B2")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("Lsk")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getAllByRole("img", { name: "Digital" })).toHaveLength(1);
    expect(within(rowOf("Part")).getByText("Reading & UoE")).toBeInTheDocument();
  });
});
