import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

function getOrCreateGuestId() {
  let id = localStorage.getItem("ironlog.guestId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ironlog.guestId", id);
  }
  return id;
}
setAuthTokenGetter(() => "guest:" + getOrCreateGuestId());

// Force dark mode
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")!).render(<App />);