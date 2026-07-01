import React from "react";
import { createRoot } from "react-dom/client";
import ArcadeConsole from "../consola-director_2.jsx";

// Shim de window.storage → localStorage (el componente lo usa como en el entorno artifact)
if (!window.storage) {
  window.storage = {
    get: async (k) => {
      const value = localStorage.getItem(k);
      return value == null ? null : { value };
    },
    set: async (k, v) => {
      localStorage.setItem(k, v);
    },
  };
}

createRoot(document.getElementById("root")).render(<ArcadeConsole />);
