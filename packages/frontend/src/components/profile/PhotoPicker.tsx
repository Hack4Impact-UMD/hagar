import { useRef } from "react";
import type { ReactNode } from "react";
import { PROFILE_PHOTO_ACCEPT } from "@frontend/lib/profilePhotos.ts";

interface PhotoPickerProps {
  onPick: (file: File) => void;
  /** The avatar to show. Clicking it opens the file picker. */
  children: ReactNode;
}

export function PhotoPicker({ onPick, children }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label="Change profile picture"
        className="group/picker relative flex h-28.25 w-27.5 shrink-0 cursor-pointer flex-col justify-start outline-none"
        onClick={() => inputRef.current?.click()}
      >
        {/* The ring goes on the avatar because this button is taller than the
            avatar, so a ring on the button would be an oval. */}
        <span className="block size-27.5 rounded-full group-focus-visible/picker:ring-3 group-focus-visible/picker:ring-ring/50">
          {children}
        </span>
        <span
          aria-hidden
          className="absolute right-0.5 bottom-0 flex size-8.75 items-center justify-center rounded-full border border-[#d9d9d9] bg-muted"
        >
          {/* Lucide's `plus`, which is what the Figma uses. The project only
              has Phosphor icons, and this is the only Lucide one needed. The
              stroke is scaled from the 24px grid so it renders 1.94px wide at
              this size. */}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.28"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-[1.276rem] text-muted-foreground"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        hidden
        data-testid="photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Clearing the value lets the same file be picked again after it
          // was rejected or discarded, which would otherwise not fire a change.
          event.target.value = "";
          if (file) onPick(file);
        }}
      />
    </>
  );
}
