import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Board } from "./Board";
import { MAX_SESSIONS } from "../config/board";
import { STORAGE_KEY } from "../config/storage";
import { hydrateFromStorage } from "../store/boardStore";

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

const advance = (ms: number): void => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

beforeEach(() => {
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
  it("shares one label column and one centre number across four sessions", () => {
    seed([
      paperSession("one", "B2 First", 0),
      paperSession("two", "C1 Advanced", 0),
      paperSession("three", "A2 Key", 0),
      paperSession("four", "B1 Preliminary", 1),
    ]);

    render(<Board />);

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

  it("stops adding sessions at the maximum", () => {
    seed([
      paperSession("one", "B2 First", 0),
      paperSession("two", "C1 Advanced", 0),
      paperSession("three", "A2 Key", 0),
    ]);

    render(<Board />);
    const addButton = screen.getByRole("button", { name: "+ Add session" });

    expect(addButton).toBeEnabled();

    fireEvent.click(addButton);

    expect(screen.getAllByRole("columnheader")).toHaveLength(MAX_SESSIONS);
    expect(addButton).toBeDisabled();
  });

  it("removes the session its remove button names", () => {
    seed([paperSession("one", "B2 First", 0), paperSession("two", "C1 Advanced", 0)]);

    render(<Board />);
    fireEvent.click(screen.getByRole("button", { name: "Remove session 1" }));

    expect(screen.queryByText("B2 First")).not.toBeInTheDocument();
    expect(screen.getByText("C1 Advanced")).toBeInTheDocument();
  });

  it("gives a digital session no controls", () => {
    seed([{ ...paperSession("one", "B2 First", 0), mode: "digital" }]);

    render(<Board />);

    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reset" })).not.toBeInTheDocument();
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

    render(<Board />);

    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next: Writing" })).not.toBeInTheDocument();

    advance(2000);

    expect(screen.getByRole("button", { name: "Next: Writing" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("reaches the finished state from a started run with no further interaction", () => {
    seed([paperSession("one", "Pre A1 Starters", 0)]);

    render(<Board />);
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

    render(<Board />);
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

    const { unmount } = render(<Board />);

    expect(document.querySelectorAll("[data-density]")).toHaveLength(1);
    expect(within(rowOf("Exam")).getByText("B1 Preliminary")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("B2 First Digital")).toBeInTheDocument();
    unmount();

    seed([
      paperSession("one", "B1 Preliminary", 0),
      { ...paperSession("two", "B2 First", 0), mode: "digital" },
      { ...paperSession("three", "Linguaskill General", 0), mode: "digital" },
    ]);

    render(<Board />);

    expect(document.querySelectorAll("[data-density]")).toHaveLength(1);
    expect(within(rowOf("Exam")).getByText("PET")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("FCE Dg")).toBeInTheDocument();
    expect(within(rowOf("Exam")).getByText("Lsk Gen")).toBeInTheDocument();
    expect(within(rowOf("Part")).getByText("Reading & UoE")).toBeInTheDocument();
  });
});
