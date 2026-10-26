import { useEffect, useRef, useMemo } from "react";
import { Button } from "@frontend/components/ui/button.tsx";
import {
  PROFILE_PHOTO_ACCEPT,
  profilePhotoProblem,
} from "@frontend/lib/profilePhotos.ts";

interface ProfilePhotoPickerProps {
  file: File | null;
  error?: string | null;
  onFileSelect: (file: File | null, errorMsg: string | null) => void;
}

export function ProfilePhotoPicker({
  file,
  error,
  onFileSelect,
}: ProfilePhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. Derive the preview URL during render (no extra re-render or setState needed)
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  // 2. Use the effect strictly to clean up the object URL from browser memory
  useEffect(() => {
    if (!previewUrl) return;
    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (!selected) {
      onFileSelect(null, "Please upload a profile picture.");
      return;
    }

    const problem = profilePhotoProblem(selected);
    if (problem) {
      e.target.value = "";
      onFileSelect(null, problem);
      return;
    }

    onFileSelect(selected, null);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* circular icon and preview */}
      <div className="flex flex-col items-center gap-9.25">
      {/* circular icon and preview */}
      <div className="relative flex h-67.5 w-67.5 items-center justify-center overflow-hidden rounded-full bg-[#F1DED2]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="h-full w-full object-cover"
          />
        ) : (
          /* orange outline matching figma */
          <svg
            viewBox="0 0 190 190"
            className="h-47.5 w-47.5 text-[#C75C3B]"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* head */}
            <circle cx="95" cy="55.42" r="31.67" />
            {/* shoulders + extended vertical sides */}
            <path d="M 31.67 166.25 V 150.42 C 31.67 132.93 45.84 118.75 63.33 118.75 H 126.67 C 144.16 118.75 158.33 132.93 158.33 150.42 V 166.25" />
          </svg>
        )}
      </div>
      {/* hiddenfile input for e2e tests and form submission */}
      <input
        ref={inputRef}
        name="photo"
        type="file"
        accept={PROFILE_PHOTO_ACCEPT}
        data-testid="photo"
        className="sr-only"
        onChange={handleFileChange}
      />

      {/* outlined trigger button (recheck figma sizes+colors) */}
      <Button
        type="button"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        className="h-12.5 w-40.5 rounded-xl border-2 border-[#C75C3B] bg-white text-base font-medium text-[#C75C3B] hover:bg-[#F5DFD5]/40 hover:text-[#C75C3B] cursor-default hover:cursor-pointer"
        // matches exact figma dimension
      >
        Upload photo
      </Button>

      {error && (
        <p
          role="alert"
          className="max-w-55 text-center text-sm text-red-600"
        >
          {error}
        </p>
      )}
      </div>
    </div>
  );
 
}
