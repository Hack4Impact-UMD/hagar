import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@frontend/index.css";
import { queryClient } from "@frontend/lib/trpc.ts";
import { App } from "@frontend/components/App.tsx";
import { AuthProvider } from "@frontend/components/auth/AuthProvider.tsx";
import { TooltipProvider } from "@frontend/components/ui/tooltip.tsx";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
