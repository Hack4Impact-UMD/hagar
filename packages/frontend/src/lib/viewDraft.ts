import type {
  ChartDefinition,
  UpdateViewInput,
  View,
  ViewShareOption,
} from "@repo/common";

const MAX_NAME_LENGTH = 500;

/**
 * Card names can repeat, so each draft card carries its own id for React keys
 * and for removing the right card. The id never leaves the client.
 */
export type DraftCard = { id: string; name: string };

export type ViewDraft = {
  name: string;
  shareOption: ViewShareOption;
  cards: DraftCard[];
};

/** What a draft is compared against when saving. */
type Baseline = Pick<View, "name" | "shareOption" | "charts">;

/** The fields to send on Save. `null` means that call isn't needed. */
export type DraftChanges = {
  update: Omit<UpdateViewInput, "viewId"> | null;
  shareOption: ViewShareOption | null;
};

/** The trimmed name if it is 1 to 500 characters, otherwise `null`. */
export function cleanName(raw: string): string | null {
  const name = raw.trim();
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

function newCard(name: string): DraftCard {
  return { id: crypto.randomUUID(), name };
}

const hasKeys = (obj: object) => Object.keys(obj).length > 0;

export function draftFromView(view: Baseline): ViewDraft {
  return {
    name: view.name,
    shareOption: view.shareOption,
    cards: view.charts.map((c) => newCard(c.name)),
  };
}

/** Pass a name that has been through `cleanName`. */
export function addCard(draft: ViewDraft, name: string): ViewDraft {
  return { ...draft, cards: [...draft.cards, newCard(name)] };
}

export function removeCard(draft: ViewDraft, id: string): ViewDraft {
  return { ...draft, cards: draft.cards.filter((c) => c.id !== id) };
}

function cardsChanged(
  saved: readonly ChartDefinition[],
  cards: readonly DraftCard[],
): boolean {
  if (saved.length !== cards.length) return true;
  return cards.some((card, i) => card.name !== saved[i]?.name);
}

/**
 * What Save has to send for `draft` compared with `baseline`. The baseline is
 * the view as last saved, which after a partly failed save is the half that
 * did save, so a retry sends only the rest.
 */
export function diffDraft(baseline: Baseline, draft: ViewDraft): DraftChanges {
  const update: Omit<UpdateViewInput, "viewId"> = {};

  const name = draft.name.trim();
  if (name !== baseline.name) update.name = name;

  // Rebuilt as `{ name }` because the backend rejects any extra field,
  // including the draft's client-side id.
  if (cardsChanged(baseline.charts, draft.cards)) {
    update.charts = draft.cards.map((c) => ({ name: c.name }));
  }

  const shareOption =
    draft.shareOption !== baseline.shareOption ? draft.shareOption : null;

  return { update: hasKeys(update) ? update : null, shareOption };
}
