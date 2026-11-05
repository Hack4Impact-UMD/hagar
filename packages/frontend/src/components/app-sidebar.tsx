import type * as React from "react";
import { isActive } from "@repo/common";
import {
  CalendarBlankIcon,
  ClipboardTextIcon,
  DotsThreeVerticalIcon,
  FileTextIcon,
  HouseIcon,
  SignOutIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "cn";
import { auth } from "@frontend/lib/firebase.ts";
import { trpc } from "@frontend/lib/trpc.ts";
import { UserAvatar } from "@frontend/components/user-management/user-avatar.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@frontend/components/ui/dropdown-menu.tsx";
import { Sidebar, SidebarContent } from "@frontend/components/ui/sidebar.tsx";

const NAV_ITEMS = [
  { title: "Dashboards", to: "/", icon: HouseIcon, admin: false },
  { title: "Calendar", to: "/calendar", icon: CalendarBlankIcon, admin: false },
  {
    title: "Campaigns",
    to: "/campaigns",
    icon: ClipboardTextIcon,
    admin: false,
  },
  {
    title: "Reports",
    to: "/reports/history",
    icon: FileTextIcon,
    admin: false,
  },
  {
    title: "User Management",
    to: "/user-management",
    icon: UsersThreeIcon,
    admin: true,
  },
] as const satisfies readonly {
  title: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  admin: boolean;
}[];

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { data: me } = useQuery({
    ...trpc.me.queryOptions(),
    staleTime: "static",
  });
  const user = me !== undefined && isActive(me) ? me : undefined;
  const isViewer = user?.role === "Viewer";
  const navItems = NAV_ITEMS.filter((item) => !(item.admin && isViewer));

  return (
    <Sidebar collapsible="none" {...props}>
      <SidebarContent className="gap-0 overflow-hidden p-0">
        <Link to="/" className="block shrink-0 pt-5.5 pb-17 pl-3.25">
          <img src="/logo.png" alt="Hagar" className="w-44" />
        </Link>

        <nav className="flex flex-col gap-0.75">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

            return (
              <Link
                key={item.title}
                to={item.to}
                className={cn(
                  "relative flex h-12 items-center gap-2.5 pr-3.5 pl-6.25 text-base leading-5.25 text-black hover:bg-sidebar-accent/50",
                  active && "bg-sidebar-accent",
                )}
              >
                {active ? (
                  <span className="absolute inset-y-0 left-0 w-1 bg-sidebar-primary" />
                ) : null}
                <Icon className="size-5 shrink-0" />
                <span className="flex-1">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {user ? (
          <div className="flex h-22.5 shrink-0 items-center gap-3 border-t-2 border-white px-4">
            <Link
              to="/profile"
              data-testid="profile-link"
              className="flex min-w-0 flex-1 items-center gap-3"
            >
              <UserAvatar user={user} className="size-11.25 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-base leading-5.25 font-bold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-sm leading-4.5">{user.role}</p>
              </div>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="shrink-0 cursor-pointer rounded p-1 text-black/50 hover:text-black">
                <DotsThreeVerticalIcon className="size-4" weight="bold" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                <DropdownMenuItem onClick={() => void auth.signOut()}>
                  <SignOutIcon /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </SidebarContent>
    </Sidebar>
  );
}
