// TEMPORARY: a preview of the homepage with sample data. Never commit this file.
// Open /home-preview while signed in. It fakes the views backend for this tab
// and sends you to the homepage. Reload the page to go back to the real backend.
import type {
  ChartDefinition,
  UserInfo,
  View,
  ViewShareOption,
} from "@repo/common";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/home-preview")({
  beforeLoad: () => {
    installFakeBackend();
    throw redirect({ to: "/" });
  },
});

// Add a procedure name, such as "views.setShareOption", to see how the page
// handles that call failing.
const FAIL = new Set<string>([]);

const DELAY_MS = 500;
const PHOTO = "profile-photos/sample/00000000-0000-0000-0000-000000000000.png";

type Input = {
  viewId: string;
  name?: string;
  charts?: ChartDefinition[];
  shareOption?: ViewShareOption;
  uids?: string[];
};

let installed = false;

function installFakeBackend() {
  if (installed) return;
  installed = true;

  const me = queryClient.getQueryData(trpc.me.queryKey());
  if (!me) throw new Error("Sign in before opening /home-preview.");
  const myUid = me.uid;

  const users = new Map<string, UserInfo>([
    [
      myUid,
      {
        uid: myUid,
        firstName: me.firstName ?? "",
        lastName: me.lastName ?? "",
        email: me.email,
        photoPath: me.photoPath ?? PHOTO,
      },
    ],
    [
      "priya",
      {
        uid: "priya",
        firstName: "Priya",
        lastName: "Raman",
        email: "priya@example.com",
        photoPath: PHOTO,
      },
    ],
    [
      "marcus",
      {
        uid: "marcus",
        firstName: "Marcus",
        lastName: "Lee",
        email: "marcus@example.com",
        photoPath: PHOTO,
      },
    ],
  ]);

  const views: View[] = [
    sampleView(
      "website",
      "Website traffic",
      myUid,
      "PRIVATE",
      ["Visits over time", "Bounce rate", "Top pages", "Signups"],
      1,
    ),
    sampleView(
      "email",
      "Email campaigns",
      myUid,
      "ANYONE_VIEW",
      ["Open rate", "Click rate", "Unsubscribes"],
      2,
    ),
    sampleView(
      "donors",
      "Q3 donors",
      "priya",
      "ANYONE_EDIT",
      ["Donations by month", "New donors", "Average gift"],
      3,
    ),
    sampleView(
      "board",
      "Board summary",
      "marcus",
      "ANYONE_VIEW",
      ["Revenue", "Members"],
      4,
    ),
    sampleView("empty", "Empty view", myUid, "PRIVATE", [], 5),
  ];

  function respond(path: string, input: Input) {
    if (FAIL.has(path)) return failure("INTERNAL_SERVER_ERROR");

    if (path === "users.info") {
      return success((input.uids ?? []).flatMap((uid) => users.get(uid) ?? []));
    }
    if (path === "views.list") {
      return success(
        views.toSorted((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
    }
    if (path === "views.create") {
      const view = sampleView(
        crypto.randomUUID(),
        input.name ?? "",
        myUid,
        input.shareOption ?? "PRIVATE",
        [],
        0,
      );
      view.charts = input.charts ?? [];
      views.push(view);
      return success(view);
    }

    const view = views.find((v) => v.viewId === input.viewId);
    if (!view) return failure("NOT_FOUND");

    if (path === "views.get") return success(view);
    if (path === "views.copy") {
      const copy = {
        ...view,
        viewId: crypto.randomUUID(),
        name: `Copy of ${view.name}`,
        authorUid: myUid,
        shareOption: "PRIVATE" as const,
        updatedAt: now(),
      };
      views.push(copy);
      return success(copy);
    }
    if (path === "views.update") {
      if (input.name !== undefined) view.name = input.name;
      if (input.charts !== undefined) view.charts = input.charts;
      view.updatedAt = now();
      return success(view);
    }
    if (path === "views.setShareOption" && input.shareOption) {
      view.shareOption = input.shareOption;
      view.updatedAt = now();
      return success(view);
    }
    return failure("NOT_FOUND");
  }

  const realFetch = window.fetch.bind(window);
  window.fetch = async (request, init) => {
    const url = new URL(
      request instanceof Request ? request.url : request.toString(),
      location.origin,
    );
    const paths = url.pathname.replace("/api/trpc/", "").split(",");
    const faked =
      url.pathname.startsWith("/api/trpc/") &&
      paths.every((p) => p.startsWith("views.") || p === "users.info");
    if (!faked) return realFetch(request, init);

    // Batched calls send their inputs as { "0": input, "1": input, ... }.
    const raw =
      typeof init?.body === "string"
        ? init.body
        : url.searchParams.get("input");
    const inputs = (raw ? JSON.parse(raw) : {}) as Record<string, Input>;
    await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    const results = paths.map((path, i) =>
      respond(path, inputs[i] ?? { viewId: "" }),
    );
    return Response.json(results);
  };
}

function sampleView(
  viewId: string,
  name: string,
  authorUid: string,
  shareOption: ViewShareOption,
  cards: string[],
  daysAgo: number,
): View {
  const updatedAt = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
  return {
    viewId,
    name,
    authorUid,
    shareOption,
    charts: cards.map((card) => ({ name: card })),
    updatedAt,
  };
}

function now() {
  return new Date().toISOString();
}

function success(data: unknown) {
  return { result: { data } };
}

function failure(code: string) {
  return { error: { message: code, code: -32_603, data: { code } } };
}
