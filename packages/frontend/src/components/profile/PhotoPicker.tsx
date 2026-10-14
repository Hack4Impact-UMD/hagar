import { PlusIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import { PROFILE_PHOTO_ACCEPT } from "@frontend/lib/profilePhotos.ts";

interface PhotoPickerProps {
  onPick: (file: File) => void;
}

export function PhotoPicker({ onPick }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label="Change profile picture"
        onClick={() => inputRef.current?.click()}
      >
        <PlusIcon />
      </Button>
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
