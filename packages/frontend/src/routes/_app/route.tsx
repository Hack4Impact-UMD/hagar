import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@frontend/components/app-sidebar.tsx";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@frontend/components/ui/sidebar.tsx";

/**
 * Wraps every page in `routes/_app/` in the sidebar. The folder adds no URL
 * segment, and access is still decided by the root route's guard.
 */
export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center px-2">
          <SidebarTrigger />
        </header>
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
