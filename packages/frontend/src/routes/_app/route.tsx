import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@frontend/components/app-sidebar.tsx";
import {
  SidebarInset,
  SidebarProvider,
} from "@frontend/components/ui/sidebar.tsx";

/**
 * Wraps every page in `routes/_app/` in the sidebar. The folder adds no URL
 * segment, and access is still decided by the root route's guard.
 */
export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  return (
    // Capped to the viewport and non-scrolling so the sidebar's own height
    // stays pinned to the screen instead of stretching to match a tall page;
    // SidebarInset scrolls internally instead.
    <SidebarProvider className="h-svh overflow-hidden">
      <AppSidebar />
      <SidebarInset className="overflow-y-auto">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
