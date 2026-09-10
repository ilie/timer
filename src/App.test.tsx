import { StrictMode } from "react";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import App from "./App";
import { STORAGE_KEY } from "./config/storage";
import { getSnapshot, hydrateFromStorage, startSession } from "./store/boardStore";

const idleSession = (id: string, examName: string, partIndex: number) => ({
  id,
  examName,
  partIndex,
  mode: "paper",
  extraMinutes: 0,
  timer: { status: "idle" },
});

const seedFourSessions = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      centreNumber: "ES432",
      sessions: [
        idleSession("session-1", "A2 Key", 0),
        idleSession("session-2", "C1 Advanced", 0),
        idleSession("session-3", "B1 Preliminary", 0),
        idleSession("session-4", "Pre A1 Starters", 0),
      ],
      break: { timer: { status: "idle" }, minutes: 15 },
    }),
  );
  hydrateFromStorage();
};

const seedOneSession = () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      centreNumber: "ES432",
      sessions: [idleSession("session-1", "B2 First", 0)],
      break: { timer: { status: "idle" }, minutes: 15 },
    }),
  );
  hydrateFromStorage();
};

const openAddDialog = async (user: UserEvent) => {
  await user.click(screen.getByRole("button", { name: "Add session" }));
};

const openTabDialog = async (user: UserEvent, examLabel: string) => {
  await user.click(screen.getByRole("button", { name: `Configure ${examLabel}` }));
};

const chooseExam = async (user: UserEvent, examName: string) => {
  await user.selectOptions(screen.getByLabelText("Exam"), examName);
};

const choosePart = async (user: UserEvent, partName: string) => {
  await user.selectOptions(
    screen.getByLabelText("Component"),
    screen.getByRole("option", { name: partName }),
  );
};

const chooseMode = async (user: UserEvent, modeLabel: string) => {
  await user.click(screen.getByRole("radio", { name: modeLabel }));
};

const saveButton = () => screen.getByRole("button", { name: "Save" });

const save = async (user: UserEvent) => {
  await user.click(saveButton());
};

const cancel = async (user: UserEvent) => {
  await user.click(screen.getByRole("button", { name: "Cancel" }));
};

const examNames = () => getSnapshot().sessions.map((session) => session.examName);

beforeEach(() => {
  localStorage.clear();
  hydrateFromStorage();
});

afterEach(() => {
  localStorage.clear();
  hydrateFromStorage();
});

test("renders the exam board", () => {
  render(<App />);
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});

test("opens once under the double effects of strict mode", async () => {
  const user = userEvent.setup();
  render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

  await openAddDialog(user);

  expect(screen.getByRole("dialog")).toHaveAttribute("open");
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
});

test("keeps Save disabled until the exam, the component and the format are all chosen", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);

  expect(saveButton()).toBeDisabled();

  await chooseExam(user, "B2 First");
  expect(saveButton()).toBeDisabled();

  await choosePart(user, "Reading & Use of English");
  expect(saveButton()).toBeDisabled();

  await chooseMode(user, "Paper");
  expect(saveButton()).toBeEnabled();
});

test("adds nothing while the dialog is open and adds the chosen configuration on save", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  await chooseExam(user, "B2 First");
  await choosePart(user, "Writing");
  await chooseMode(user, "Paper");

  expect(getSnapshot().sessions).toHaveLength(0);

  await save(user);

  expect(getSnapshot().sessions).toHaveLength(1);
  expect(getSnapshot().sessions[0]).toMatchObject({
    examName: "B2 First",
    partIndex: 1,
    mode: "paper",
    extraMinutes: 0,
  });
});

test("adds nothing when the add dialog is cancelled", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  await chooseExam(user, "B2 First");
  await choosePart(user, "Writing");
  await chooseMode(user, "Paper");
  await cancel(user);

  expect(getSnapshot().sessions).toHaveLength(0);
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
});

test("leaves every configured session in place when the dialog is cancelled", async () => {
  const user = userEvent.setup();
  seedFourSessions();
  render(<App />);

  await openTabDialog(user, "KET");
  await chooseExam(user, "B2 First");
  await choosePart(user, "Reading & Use of English");
  await chooseMode(user, "Paper");
  await cancel(user);

  expect(getSnapshot().sessions).toHaveLength(4);
  expect(examNames()).toEqual(["A2 Key", "C1 Advanced", "B1 Preliminary", "Pre A1 Starters"]);
});

test("reconfigures one session on save and keeps the others", async () => {
  const user = userEvent.setup();
  seedFourSessions();
  render(<App />);

  await openTabDialog(user, "KET");
  await chooseExam(user, "B2 First");
  await choosePart(user, "Reading & Use of English");
  await chooseMode(user, "Paper");
  await save(user);

  expect(getSnapshot().sessions).toHaveLength(4);
  expect(examNames()).toEqual(["B2 First", "C1 Advanced", "B1 Preliminary", "Pre A1 Starters"]);
});

test("puts focus on the exam field and moves it to the component after a choice", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);

  expect(screen.getByLabelText("Exam")).toHaveFocus();

  await chooseExam(user, "B2 First");

  expect(screen.getByLabelText("Component")).toHaveFocus();
});

test("leaves focus alone on the edit flow's first render", async () => {
  const user = userEvent.setup();
  seedOneSession();
  render(<App />);

  await openTabDialog(user, "B2 First");

  expect(screen.getByLabelText("Exam")).toHaveFocus();
  expect(screen.getByLabelText("Component")).not.toHaveFocus();
});

test("opens a tab already holding that session's configuration", async () => {
  const user = userEvent.setup();
  seedOneSession();
  render(<App />);

  await openTabDialog(user, "B2 First");

  expect(screen.getByLabelText("Exam")).toHaveValue("B2 First");
  expect(screen.getByLabelText("Component")).toHaveValue("0");
  expect(screen.getByRole("radio", { name: "Paper" })).toBeChecked();
});

test("re-seeds the countdown when a different component is saved", async () => {
  const user = userEvent.setup();
  seedOneSession();
  render(<App />);
  act(() => {
    startSession("session-1");
  });

  await openTabDialog(user, "B2 First");
  await choosePart(user, "Writing");
  await save(user);

  expect(getSnapshot().sessions[0]?.partIndex).toBe(1);
  expect(getSnapshot().sessions[0]?.timer).toEqual({ status: "idle" });
});

test("leaves a running countdown untouched when the same configuration is saved again", async () => {
  const user = userEvent.setup();
  seedOneSession();
  render(<App />);
  act(() => {
    startSession("session-1");
  });
  const runningTimer = getSnapshot().sessions[0]?.timer;
  expect(runningTimer?.status).toBe("running");

  await openTabDialog(user, "B2 First");
  await save(user);

  expect(getSnapshot().sessions[0]?.timer).toEqual(runningTimer);
});

test("closes on a backdrop click without committing anything", async () => {
  const user = userEvent.setup();
  seedOneSession();
  render(<App />);

  await openTabDialog(user, "B2 First");
  await choosePart(user, "Writing");

  const dialog = screen.getByRole("dialog");
  await user.click(dialog);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(getSnapshot().sessions[0]?.partIndex).toBe(0);
});

test("stays open when a press inside the dialog is released over the backdrop", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  const dialog = screen.getByRole("dialog");
  await user.pointer([
    { keys: "[MouseLeft>]", target: screen.getByLabelText("Exam") },
    { keys: "[/MouseLeft]", target: dialog },
  ]);

  expect(screen.getByRole("dialog")).toBeInTheDocument();
});

test("names the fields still missing while Save is disabled", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);

  const outstanding = screen.getByRole("status");
  expect(outstanding).toHaveTextContent("Still to choose: an exam, a component, a format.");
  expect(screen.getByLabelText("Exam")).toHaveAttribute("aria-describedby", outstanding.id);
  expect(screen.getAllByText("Required")).toHaveLength(3);
  expect(screen.getByRole("radio", { name: "Paper" })).toBeDisabled();

  await chooseExam(user, "B2 First");

  expect(screen.getByText("Still to choose: a component, a format.")).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Paper" })).toBeEnabled();

  await choosePart(user, "Writing");
  await chooseMode(user, "Paper");

  expect(screen.queryByText(/Still to choose/)).not.toBeInTheDocument();
  expect(screen.queryByText("Required")).not.toBeInTheDocument();
  expect(saveButton()).toBeEnabled();
});

test("offers a digital-only exam no paper format", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  await chooseExam(user, "Linguaskill General");

  expect(screen.queryByRole("radio", { name: "Paper" })).not.toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "Digital" })).toBeInTheDocument();
});

test("clears a component chosen for the previous exam", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  await chooseExam(user, "B2 First");
  await choosePart(user, "Writing");
  await chooseExam(user, "A2 Key");

  expect(screen.getByLabelText("Component")).toHaveValue("");
  expect(saveButton()).toBeDisabled();
});

test("refuses a fractional number of extra minutes", async () => {
  const user = userEvent.setup();
  render(<App />);

  await openAddDialog(user);
  await chooseExam(user, "B2 First");
  await choosePart(user, "Writing");
  await chooseMode(user, "Paper");

  const extraMinutes = screen.getByLabelText("Extra time (whole minutes)");
  await user.clear(extraMinutes);
  await user.type(extraMinutes, "12.5");

  expect(saveButton()).toBeDisabled();
  expect(screen.getByRole("alert")).toBeInTheDocument();

  await user.clear(extraMinutes);
  await user.type(extraMinutes, "15");

  expect(saveButton()).toBeEnabled();

  await save(user);

  expect(getSnapshot().sessions[0]?.extraMinutes).toBe(15);
});

test("persists an edited centre number and leaves it alone when cancelled", async () => {
  const user = userEvent.setup();
  render(<App />);

  await user.click(screen.getByRole("button", { name: "Edit centre number" }));
  const centreNumber = screen.getByLabelText("Centre number");
  await user.clear(centreNumber);
  await user.type(centreNumber, "ES777");
  await cancel(user);

  expect(getSnapshot().centreNumber).toBe("ES432");

  await user.click(screen.getByRole("button", { name: "Edit centre number" }));
  const reopened = screen.getByLabelText("Centre number");
  await user.clear(reopened);
  await user.type(reopened, "ES777");
  await save(user);

  expect(getSnapshot().centreNumber).toBe("ES777");

  hydrateFromStorage();

  expect(getSnapshot().centreNumber).toBe("ES777");
  expect(screen.getByText("Centre no: ES777")).toBeInTheDocument();
});
