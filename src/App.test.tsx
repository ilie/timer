import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the exam board", () => {
  render(<App />);
  expect(screen.getByRole("contentinfo")).toBeInTheDocument();
});
