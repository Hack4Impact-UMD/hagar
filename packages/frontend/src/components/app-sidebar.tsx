import type * as React from "react";
import { isActive } from "@repo/common";
import { UserCircleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { trpc } from "@frontend/lib/trpc.ts";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@frontend/components/ui/sidebar.tsx";

const NAV_ITEMS = [
  { title: "Profile", to: "/profile", icon: <UserCircleIcon />, admin: false },
  {
    title: "User management",
    to: "/user-management",
    icon: <UsersThreeIcon />,
    admin: true,
  },
] as const;

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: me } = useQuery({
    ...trpc.me.queryOptions(),
    staleTime: "static",
  });
  const isViewer = me !== undefined && isActive(me) && me.role === "Viewer";
  const navItems = NAV_ITEMS.filter((item) => !(item.admin && isViewer));

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.to}
                  tooltip={item.title}
                >
                  <Link to={item.to}>
                    {item.icon}
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
