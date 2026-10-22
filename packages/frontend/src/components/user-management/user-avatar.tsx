import type { UserProfile } from "@repo/common";
import { useQuery } from "@tanstack/react-query";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@frontend/components/ui/avatar.tsx";
import { initials } from "@common/user-helpers.ts";
import { profilePhotoUrlOptions } from "@frontend/lib/profilePhotos.ts";

interface UserAvatarProps {
  user: Pick<UserProfile, "photoPath" | "firstName" | "lastName">;
  className?: string;
}

/* Shows initials while the photo loads, if it fails, or if there is none */
export function UserAvatar({ user, className }: UserAvatarProps) {
  const photo = useQuery(profilePhotoUrlOptions(user.photoPath));
  return (
    <Avatar className={className}>
      {photo.data ? <AvatarImage src={photo.data} alt="" /> : null}
      <AvatarFallback>{initials(user)}</AvatarFallback>
    </Avatar>
  );
}
