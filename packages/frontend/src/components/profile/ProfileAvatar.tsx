import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@frontend/components/ui/avatar.tsx";
import { profilePhotoUrlOptions } from "@frontend/lib/profilePhotos.ts";

interface ProfileAvatarProps {
  photoPath: string;
  firstName: string;
  lastName: string;
  /** A local preview of a photo that hasn't been saved yet. */
  previewUrl?: string | null;
  className?: string;
}

export function ProfileAvatar({
  photoPath,
  firstName,
  lastName,
  previewUrl = null,
  className,
}: ProfileAvatarProps) {
  const { data: savedUrl } = useQuery(profilePhotoUrlOptions(photoPath));
  const url = previewUrl ?? savedUrl;
  // Spread so a name starting with a surrogate pair isn't split in half.
  const initials = [...firstName][0] + ([...lastName][0] ?? "");

  return (
    <Avatar className={className}>
      {/* Radix only renders the fallback while the image is loading or if it
          fails, so there is no need to track either state here. */}
      {url ? <AvatarImage src={url} alt="" /> : null}
      <AvatarFallback>{initials.toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
