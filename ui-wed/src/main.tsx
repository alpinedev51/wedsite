import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { WeddingConfigProvider } from "./config/WeddingConfigProvider.tsx";
import { MotionProvider } from "./components/motion/MotionProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WeddingConfigProvider>
      <MotionProvider>
        <App />
      </MotionProvider>
    </WeddingConfigProvider>
  </StrictMode>,
);
