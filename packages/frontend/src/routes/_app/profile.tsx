import { MAX_NAME_LENGTH, MAX_PHONE_NUMBER_LENGTH } from "@repo/common";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { changedFields } from "@frontend/components/profile/changedFields.ts";
import { PhotoPicker } from "@frontend/components/profile/PhotoPicker.tsx";
import { ProfileAvatar } from "@frontend/components/profile/ProfileAvatar.tsx";
import { ProfileField } from "@frontend/components/profile/ProfileField.tsx";
import { ProfileSection } from "@frontend/components/profile/ProfileSection.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { useObjectUrl } from "@frontend/hooks/use-object-url.ts";
import {
  profilePhotoProblem,
  uploadProfilePhoto,
} from "@frontend/lib/profilePhotos.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const router = useRouter();
  const { data: profile } = useQuery(trpc.me.queryOptions());
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoPreviewUrl = useObjectUrl(photo);

  const uploadPhoto = useMutation({ mutationFn: uploadProfilePhoto });
  const updateProfile = useMutation(
    trpc.users.updateProfile.mutationOptions({
      // `me` is cached for good, so the page keeps showing the old values
      // unless the saved profile replaces them.
      onSuccess: (saved) => queryClient.setQueryData(trpc.me.queryKey(), saved),
      onError: async (error) => {
        // The user is no longer approved, e.g. an admin moved them back to
        // awaiting approval or deleted them. Refetch `me` and re-run the
        // route guard so they land on the page for their new state.
        if (error.data?.code !== "FORBIDDEN") return;
        await queryClient.query({ ...trpc.me.queryOptions(), staleTime: 0 });
        await router.invalidate();
      },
    }),
  );
  const isSaving = uploadPhoto.isPending || updateProfile.isPending;
  const saveError = uploadPhoto.error ?? updateProfile.error;
  const { reset: resetUpload } = uploadPhoto;
  const { reset: resetUpdate } = updateProfile;

  // Leaving edit mode unmounts the text inputs, which discards their drafts,
  // so the photo state has to be dropped explicitly.
  const stopEditing = useCallback(() => {
    setEditing(false);
    setPhoto(null);
    setPhotoError(null);
    resetUpload();
    resetUpdate();
  }, [resetUpload, resetUpdate]);

  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Resetting a mutation doesn't cancel its request, so cancelling mid-save
      // would still update the cache afterwards. The Cancel button is disabled
      // while saving for the same reason.
      if (event.key === "Escape" && !isSaving) stopEditing();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing, isSaving, stopEditing]);

  // The route guard only lets complete profiles in, but the type can't know
  // that: the details are null while the stage is 'PROFILE SETUP'.
  if (!profile || profile.stage === "PROFILE SETUP") return null;

  const startEditing = () => setEditing(true);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const changes = changedFields(
          profile,
          new FormData(event.currentTarget),
        );
        if (!photo && Object.keys(changes).length === 0) {
          stopEditing();
          return;
        }
        // The photo is uploaded first because the profile only stores its
        // path.
        if (photo) {
          uploadPhoto.mutate(photo, {
            onSuccess: (photoPath) =>
              updateProfile.mutate(
                { ...changes, photoPath },
                { onSuccess: stopEditing },
              ),
          });
        } else {
          updateProfile.mutate(changes, { onSuccess: stopEditing });
        }
      }}
    >
      <main className="page mx-0 max-w-none md:px-12">
        <header className="page-header">
          <h1 data-testid="profile" className="page-title text-3xl">
            My Profile
          </h1>
          {/* Separate keys give each mode its own button element. Reusing one
              and flipping its type would let the click that enters edit mode
              also submit the form. */}
          {editing ? (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-sm px-5 text-base"
                disabled={isSaving}
                onClick={stopEditing}
              >
                Cancel
              </Button>
              <Button
                key="save"
                type="submit"
                className="h-11 rounded-sm px-5 text-base"
                disabled={isSaving}
              >
                Save Changes
              </Button>
            </div>
          ) : (
            <Button
              key="edit"
              type="button"
              className="h-11 rounded-sm px-5 text-base"
              onClick={startEditing}
            >
              Edit Profile
              <PencilSimpleIcon data-icon="inline-end" />
            </Button>
          )}
        </header>
        {photoError || saveError ? (
          <div className="flex flex-col gap-1">
            {photoError ? (
              <p role="alert" className="form-error">
                {photoError}
              </p>
            ) : null}
            {saveError ? (
              <p role="alert" className="form-error">
                {saveError.message}
              </p>
            ) : null}
          </div>
        ) : null}
        <section className="page-summary">
          <div className="avatar-with-badge">
            <ProfileAvatar
              photoPath={profile.photoPath}
              firstName={profile.firstName}
              lastName={profile.lastName}
              previewUrl={photoPreviewUrl}
              className="size-28 *:data-[slot=avatar-fallback]:text-3xl"
            />
            {editing ? (
              <PhotoPicker
                className="absolute right-0 bottom-0 rounded-full bg-background"
                onPick={(file) => {
                  const problem = profilePhotoProblem(file);
                  setPhotoError(problem);
                  // A rejected pick keeps the previous valid choice.
                  if (!problem) setPhoto(file);
                }}
              />
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="summary-name font-bold">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-primary">{profile.role}</p>
            <p>{profile.email}</p>
          </div>
        </section>
        <ProfileSection
          title="Personal Information"
          onEdit={editing ? undefined : startEditing}
        >
          <dl className="field-grid">
            <ProfileField
              label="First Name"
              value={profile.firstName}
              input={{
                name: "firstName",
                type: "text",
                maxLength: MAX_NAME_LENGTH,
              }}
              editing={editing}
            />
            <ProfileField
              label="Last Name"
              value={profile.lastName}
              input={{
                name: "lastName",
                type: "text",
                maxLength: MAX_NAME_LENGTH,
              }}
              editing={editing}
            />
            <ProfileField
              label="Region"
              value={profile.region}
              locked
              editing={editing}
            />
            <ProfileField
              label="Email Address"
              value={profile.email}
              locked
              editing={editing}
            />
            <ProfileField
              label="Phone Number"
              value={profile.phoneNumber}
              input={{
                name: "phoneNumber",
                type: "tel",
                maxLength: MAX_PHONE_NUMBER_LENGTH,
              }}
              editing={editing}
            />
            <ProfileField
              label="User Role"
              value={profile.role}
              locked
              editing={editing}
            />
          </dl>
        </ProfileSection>
      </main>
    </form>
  );
}
