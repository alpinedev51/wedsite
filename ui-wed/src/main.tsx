import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { WeddingConfigProvider } from "./config/WeddingConfigContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WeddingConfigProvider>
      <App />
    </WeddingConfigProvider>
  </StrictMode>,
);
