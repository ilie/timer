import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./App.css";
import App from "./App";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element #root was not found");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
