import { createRoot } from "react-dom/client";
import { GameApp } from "../src/game/ui/GameApp";
import "../src/styles.css";

// Static browser entry for Pages. Reuse the canonical game exactly; do not
// import the Grok preview shell, SSR routes, login providers or database.
const root = document.getElementById("root");
if (!root) throw new Error("The Echoes of the Nine root element is missing.");
createRoot(root).render(<GameApp />);
