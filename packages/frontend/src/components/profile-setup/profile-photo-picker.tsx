import { useEffect, useRef, useState } from "react";
import { Button } from "@frontend/components/ui/button";
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

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
      <div className="relative flex h-56 w-56 items-center justify-center overflow-hidden rounded-full bg-[#F1DED2]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Profile preview"
            className="h-full w-full object-cover"
          />
        ) : (
          /* orange outline matching figma */
          <svg
            viewBox="0 0 100 100"
            className="h-36 w-36 text-[#C75C3B]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            {/* head */}
            <circle cx="50" cy="30" r="16" />
            {/* shoulders + extended vertical sides */}
            <path d="M 16 86 V 74 C 16 58, 84 58, 84 74 V 86" />
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
        className="h-[50px] w-[162px] rounded-xl border-[2px] border-[#C75C3B] bg-white text-base font-medium text-[#C75C3B] hover:bg-[#F5DFD5]/40 hover:text-[#C75C3B]"
        // matches exact figma dimension
      >
        Upload photo
      </Button>

      {error && (
        <p role="alert" className="max-w-[220px] text-center text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}