import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { UserEvent } from "@testing-library/user-event";
import App from "./App";
import { getSnapshot, hydrateFromStorage, startSession } from "./store/boardStore";

const BRIDGED_SESSION_ID = "bridged-session";

const chooseReadingComponent = async (user: UserEvent) => {
  await user.selectOptions(screen.getByLabelText(/Type:/), "PB");
  await user.selectOptions(screen.getByLabelText(/^Exam:/), "B2 First");
  await user.selectOptions(screen.getByLabelText(/Exam Part:/), "Reading & Use of English");
};

const save = async (user: UserEvent) => {
  await user.click(screen.getByRole("button", { name: "Save" }));
};

const bridgedSession = () => getSnapshot().sessions[0];

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

test("leaves a running countdown untouched when the same configuration is saved again", async () => {
  const user = userEvent.setup();
  render(<App />);

  await chooseReadingComponent(user);
  await save(user);
  act(() => {
    startSession(BRIDGED_SESSION_ID);
  });
  const runningTimer = bridgedSession()?.timer;
  expect(runningTimer?.status).toBe("running");

  await save(user);

  expect(bridgedSession()?.timer).toEqual(runningTimer);
});

test("re-seeds the countdown when a different component is saved", async () => {
  const user = userEvent.setup();
  render(<App />);

  await chooseReadingComponent(user);
  await save(user);
  act(() => {
    startSession(BRIDGED_SESSION_ID);
  });

  await user.selectOptions(screen.getByLabelText(/Exam Part:/), "Writing");
  await save(user);

  expect(bridgedSession()?.partIndex).toBe(1);
  expect(bridgedSession()?.timer).toEqual({ status: "idle" });
});
