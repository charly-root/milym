import { createRoot } from "react-dom/client";

const root = document.getElementById("milym-experience");

if (root) {
  import("./Experience.jsx").then(({ Experience }) => {
    createRoot(root).render(<Experience root={root} />);
  });
}
