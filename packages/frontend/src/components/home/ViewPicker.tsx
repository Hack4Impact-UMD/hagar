import type { UserInfo, View } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useId, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@frontend/components/ui/avatar.tsx";
import { profilePhotoUrlOptions } from "@frontend/lib/profilePhotos.ts";
import { filterViewOptions, fullName } from "@frontend/lib/viewPicker.ts";

type ViewPickerProps = {
  views: View[];
  authors: Map<string, UserInfo>;
  authorsLoading: boolean;
  selectedId: string;
  onSelect: (viewId: string) => void;
  disabled?: boolean;
};

export function ViewPicker({
  views,
  authors,
  authorsLoading,
  selectedId,
  onSelect,
  disabled,
}: ViewPickerProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const authorNames = new Map(
    [...authors.values()].map((a) => [
      a.uid,
      fullName(a.firstName, a.lastName),
    ]),
  );
  const options = filterViewOptions(views, authorNames, query);
  const active = options[activeIndex];
  const selected = views.find((v) => v.viewId === selectedId);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }

  function choose(view: View) {
    onSelect(view.viewId);
    close();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (open) {
        setActiveIndex((i) => (i + 1 < options.length ? i + 1 : i));
      } else {
        setOpen(true);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : 0));
    } else if (e.key === "Enter" && open && active) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      close();
    }
  }

  return (
    <div className="relative w-72">
      <input
        type="text"
        role="combobox"
        aria-label="Choose a view"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && active ? `${listId}-${active.viewId}` : undefined
        }
        placeholder={selected?.name ?? "Choose a view"}
        value={query}
        disabled={disabled}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={close}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-primary px-3 py-1.5 text-sm placeholder:text-primary disabled:opacity-50"
      />

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-background shadow-md"
        >
          {options.length === 0 && (
            <li className="px-3 py-2 text-sm text-muted-foreground">
              No views found
            </li>
          )}
          {options.map((view, i) => {
            const author = authors.get(view.authorUid);
            return (
              <li
                key={view.viewId}
                id={`${listId}-${view.viewId}`}
                role="option"
                aria-selected={i === activeIndex}
                // Stops the input losing focus, which would close the list
                // before the click lands.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(view)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm",
                  i === activeIndex && "bg-muted",
                )}
              >
                <AuthorPhoto photoPath={author?.photoPath ?? null} />
                <span className="truncate">{view.name}</span>
                <span className="ml-auto truncate text-muted-foreground">
                  {authorLabel(author, authorsLoading)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function authorLabel(author: UserInfo | undefined, loading: boolean) {
  if (author) return fullName(author.firstName, author.lastName);
  if (loading) return "";
  return "Unknown user";
}

function AuthorPhoto({ photoPath }: { photoPath: string | null }) {
  const url = useQuery(profilePhotoUrlOptions(photoPath));
  return (
    <Avatar size="sm">
      {url.data && <AvatarImage src={url.data} alt="" />}
      <AvatarFallback />
    </Avatar>
  );
}
