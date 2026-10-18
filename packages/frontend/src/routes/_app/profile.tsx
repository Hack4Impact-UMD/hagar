import { MAX_NAME_LENGTH, MAX_PHONE_NUMBER_LENGTH } from "@repo/common";
import type { UpdateProfileInput } from "@repo/common";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useBlocker, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { changedFields } from "@frontend/components/profile/changedFields.ts";
import { PasswordSection } from "@frontend/components/profile/PasswordSection.tsx";
import {
  CANCEL_BUTTON,
  PRIMARY_BUTTON,
} from "@frontend/components/profile/profileButtonStyles.ts";
import { PhotoPicker } from "@frontend/components/profile/PhotoPicker.tsx";
import { ProfileAvatar } from "@frontend/components/profile/ProfileAvatar.tsx";
import { ProfileField } from "@frontend/components/profile/ProfileField.tsx";
import { ProfileSection } from "@frontend/components/profile/ProfileSection.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@frontend/components/ui/alert-dialog.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { useObjectUrl } from "@frontend/hooks/use-object-url.ts";
import { usePasswordChange } from "@frontend/hooks/use-password-change.ts";
import { uploadAvatar } from "@frontend/lib/avatarUpload.ts";
import {
  PROFILE_PHOTO_URL_KEY,
  profilePhotoProblem,
} from "@frontend/lib/profilePhotos.ts";
import { saveProfileEdits } from "@frontend/lib/saveProfile.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const router = useRouter();
  const { data: profile } = useQuery(trpc.me.queryOptions());
  const [editing, setEditing] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  // Which edits the open dialog would discard. `null` with the dialog open
  // means leaving the page, which discards both.
  const [confirmingDiscard, setConfirmingDiscard] = useState<
    "profile" | "password" | null
  >(null);
  const password = usePasswordChange();
  const {
    editing: passwordEditing,
    isDirty: passwordDirty,
    isSaving: passwordSaving,
    reset: resetPassword,
  } = password;
  const formRef = useRef<HTMLFormElement>(null);
  const photoPreviewUrl = useObjectUrl(photo);

  const uploadPhoto = useMutation({ mutationFn: uploadAvatar });
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

  // The typed text lives in the inputs, not in state, so the form is read at
  // the moment the answer is needed.
  const profileHasChanges = useCallback(() => {
    const form = formRef.current;
    if (!editing || !form || !profile || profile.stage === "PROFILE SETUP") {
      return false;
    }
    return (
      photo !== null ||
      Object.keys(changedFields(profile, new FormData(form))).length > 0
    );
  }, [editing, photo, profile]);
  const hasUnsavedChanges = useCallback(
    () => profileHasChanges() || passwordDirty,
    [profileHasChanges, passwordDirty],
  );

  // Leaving the page (a sidebar link, back, closing the tab) would throw the
  // edits away. The browser shows its own prompt for closing the tab.
  const blocker = useBlocker({
    shouldBlockFn: hasUnsavedChanges,
    enableBeforeUnload: hasUnsavedChanges,
    withResolver: true,
  });
  const dialogOpen = confirmingDiscard !== null || blocker.status === "blocked";

  // Backing out of edit mode only asks when there is something to lose.
  const cancelEditing = useCallback(() => {
    if (profileHasChanges()) setConfirmingDiscard("profile");
    else stopEditing();
  }, [profileHasChanges, stopEditing]);

  const cancelPasswordChange = useCallback(() => {
    if (passwordDirty) setConfirmingDiscard("password");
    else resetPassword();
  }, [passwordDirty, resetPassword]);

  const keepEditing = () => {
    setConfirmingDiscard(null);
    blocker.reset?.();
  };

  const discardChanges = () => {
    if (confirmingDiscard !== "password") stopEditing();
    if (confirmingDiscard !== "profile") resetPassword();
    setConfirmingDiscard(null);
    blocker.proceed?.();
  };

  useEffect(() => {
    if (!editing && !passwordEditing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Resetting a mutation doesn't cancel its request, so cancelling mid-save
      // would still update the cache afterwards. The Cancel button is disabled
      // while saving for the same reason. While the dialog is open, Escape
      // belongs to the dialog.
      if (event.key !== "Escape" || isSaving || passwordSaving || dialogOpen) {
        return;
      }
      if (editing) cancelEditing();
      else cancelPasswordChange();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [
    editing,
    passwordEditing,
    isSaving,
    passwordSaving,
    dialogOpen,
    cancelEditing,
    cancelPasswordChange,
  ]);

  // The route guard only lets complete profiles in, but the type can't know
  // that: the details are null while the stage is 'PROFILE SETUP'.
  if (!profile || profile.stage === "PROFILE SETUP") return null;

  const startEditing = () => setEditing(true);

  const saveEdits = async (changes: UpdateProfileInput) => {
    try {
      await saveProfileEdits({
        changes,
        photo,
        saveChanges: updateProfile.mutateAsync,
        savePhoto: async (file) => {
          await uploadPhoto.mutateAsync(file);
          // Waits for the new URL so the old photo doesn't flash back once the
          // preview is dropped.
          await queryClient.invalidateQueries({
            queryKey: PROFILE_PHOTO_URL_KEY,
          });
        },
      });
      stopEditing();
    } catch {
      // The mutations hold the error, and it is shown above the page.
    }
  };

  return (
    <>
      <main className="mx-auto flex w-full max-w-344 flex-col gap-8 p-4 md:pt-12.5 md:pr-14 md:pb-8 md:pl-13.25">
        <form
          ref={formRef}
          className="contents"
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
            void saveEdits(changes);
          }}
        >
          <header className="flex flex-wrap items-center justify-between gap-4">
            <h1
              data-testid="profile"
              className="text-[1.5625rem] leading-[1.2] font-semibold text-black"
            >
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
                  className={CANCEL_BUTTON}
                  disabled={isSaving}
                  onClick={cancelEditing}
                >
                  Cancel
                </Button>
                <Button
                  key="save"
                  type="submit"
                  className={PRIMARY_BUTTON}
                  disabled={isSaving}
                >
                  Save Changes
                </Button>
              </div>
            ) : (
              <Button
                key="edit"
                type="button"
                className={PRIMARY_BUTTON}
                onClick={startEditing}
              >
                Edit Profile
                <PencilSimpleIcon
                  data-icon="inline-end"
                  className="size-4.25"
                />
              </Button>
            )}
          </header>
          {photoError || saveError ? (
            <div className="flex flex-col gap-1">
              {photoError ? (
                <p role="alert" className="text-sm text-destructive">
                  {photoError}
                </p>
              ) : null}
              {saveError ? (
                <p role="alert" className="text-sm text-destructive">
                  {saveError.message}
                </p>
              ) : null}
            </div>
          ) : null}
          {/* The margins are the Figma spacing less the 2rem gap between the
            page's children. */}
          <section className="flex flex-col gap-4 border-b pb-11.75 sm:flex-row sm:items-start sm:gap-4.75 md:mt-7.25 md:mr-1.5 md:ml-4.5">
            <PhotoPicker
              onPick={(file) => {
                const problem = profilePhotoProblem(file);
                setPhotoError(problem);
                // A rejected pick keeps the previous valid choice.
                if (problem) return;
                setPhoto(file);
                // The photo is only saved with the form, so the form has to be
                // open for the Save button to appear.
                startEditing();
              }}
            >
              <ProfileAvatar
                photoPath={profile.photoPath}
                firstName={profile.firstName}
                lastName={profile.lastName}
                previewUrl={photoPreviewUrl}
                className="size-27.5 *:data-[slot=avatar-fallback]:text-3xl"
              />
            </PhotoPicker>
            <div className="flex h-28.25 min-w-0 flex-col">
              <h2 className="h-9.75 truncate text-[2rem] leading-none font-semibold text-black">
                {profile.firstName} {profile.lastName}
              </h2>
              <p className="mt-1.5 h-5.5 truncate text-lg leading-none font-medium text-primary">
                {profile.role}
              </p>
              <p className="mt-5.5 h-5.5 truncate text-lg leading-none font-medium text-black">
                {profile.email}
              </p>
            </div>
          </section>
          <ProfileSection
            title="Personal Information"
            className="md:mt-7"
            onEdit={editing ? undefined : startEditing}
          >
            {/* Both modes share one grid, so entering edit mode doesn't move any
              field. Spare room goes between the columns, so they spread across
              the card instead of hugging its left side. */}
            <dl className="grid grid-cols-1 gap-6 md:grid-cols-[repeat(3,minmax(0,16.4375rem))] md:justify-between md:gap-x-32.75 md:gap-y-11.25">
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
        </form>
        <PasswordSection password={password} onCancel={cancelPasswordChange} />
      </main>
      <AlertDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) keepEditing();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your changes will not be saved</AlertDialogTitle>
            <AlertDialogDescription>
              If you leave now, the changes you made to your profile will be
              lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={(event) => {
                // Radix would also report the dialog closing, which would
                // undo the discard by cancelling the navigation.
                event.preventDefault();
                discardChanges();
              }}
            >
              Discard changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
