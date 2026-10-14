import type { UserRegion } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ProfilePhotoPicker } from "@frontend/components/profile-setup/profile-photo-picker.tsx";
import { RegionSelect } from "@frontend/components/profile-setup/region-select.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import {
  profilePhotoProblem,
  uploadProfilePhoto,
} from "@frontend/lib/profilePhotos.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/profile-setup")({
  component: ProfileSetup,
});

const TEXT_FIELDS = [
  { name: "firstName", label: "First name", type: "text" },
  { name: "lastName", label: "Last name", type: "text" },
  { name: "phoneNumber", label: "Phone number", type: "tel" },
] as const;

function ProfileSetup() {
  const router = useRouter();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [region, setRegion] = useState<UserRegion | "">("");
  const [regionError, setRegionError] = useState<string | null>(null);

  const completeProfile = useMutation(
    trpc.users.completeProfile.mutationOptions({
      onSuccess: async (profile) => {
        queryClient.setQueryData(trpc.me.queryKey(), profile);
        await router.invalidate();
      },
    }),
  );
  const uploadPhoto = useMutation({ mutationFn: uploadProfilePhoto });
  const isPending = uploadPhoto.isPending || completeProfile.isPending;
  const error = uploadPhoto.error ?? completeProfile.error;

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Finish your profile</h1>
      <form
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (photoError || regionError) return;

          const form = new FormData(event.currentTarget);
          const text = (name: string) => String(form.get(name));

          const formPhoto = form.get("photo");
          const fileToUpload =
            photo ??
            (formPhoto instanceof File && formPhoto.size > 0
              ? formPhoto
              : null);

          let hasError = false;
          if (!fileToUpload) {
            setPhotoError("Profile photo is required.");
            hasError = true;
          } else {
            const problem = profilePhotoProblem(fileToUpload);
            if (problem) {
              setPhotoError(problem);
              hasError = true;
            }
          }

          if (!region) {
            setRegionError("Please select a region.");
            hasError = true;
          }

          if (hasError || !fileToUpload || !region) return;

          uploadPhoto.mutate(fileToUpload, {
            onSuccess: (photoPath) =>
              completeProfile.mutate({
                firstName: text("firstName"),
                lastName: text("lastName"),
                phoneNumber: text("phoneNumber"),
                photoPath,
                region,
              }),
          });
        }}
      >
        {TEXT_FIELDS.map((field) => (
          <label key={field.name}>
            {field.label}{" "}
            <input
              name={field.name}
              type={field.type}
              required
              data-testid={field.name}
              className="border"
            />
          </label>
        ))}

        <ProfilePhotoPicker
          file={photo}
          error={photoError}
          onFileSelect={(selectedFile, err) => {
            setPhoto(selectedFile);
            setPhotoError(err);
          }}
        />

        <RegionSelect
          value={region}
          error={regionError}
          onChange={(selectedRegion) => {
            setRegion(selectedRegion);
            setRegionError(null);
          }}
        />

        <button
          type="submit"
          data-testid="next"
          disabled={isPending}
          className="self-start border px-3 py-1"
        >
          Finish Profile
        </button>
        {error ? <p role="alert">{error.message}</p> : null}
      </form>
      <button
        type="button"
        data-testid="sign-out"
        onClick={() => void auth.signOut()}
        className="self-start border px-3 py-1"
      >
        Sign out
      </button>
    </main>
  );
}

  // my notes: routes when user clicks the finish profile button, then goes to the verify-email page --> this logic is already implemented.

  //       <button
  /* type="button"
  data-testid="sign-out"
  onClick={() => void auth.signOut()}
  className="self-start border px-3 py-1"
>
  Sign out
</button> */ 

/*
          <label>
          Profile picture{" "}
          <input
            name="photo"
            type="file"
            accept={PROFILE_PHOTO_ACCEPT}
            required
            data-testid="photo"
          />
        </label>
*/

/*
  OLD ONSUBMIT:
   onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const text = (name: string) => String(form.get(name));
          const photo = form.get("photo");
          if (!(photo instanceof File)) return;
          uploadPhoto.mutate(photo, {
            onSuccess: (photoPath) =>
              completeProfile.mutate({
                firstName: text("firstName"),
                lastName: text("lastName"),
                phoneNumber: text("phoneNumber"),
                photoPath,
                // The select only offers `userRegions`; the server
                // re-validates.
                region: text("region") as UserRegion,
              }),
          });
        }}
*/

/*
 old choose region 
         <label>
          Region{" "}
          <select
            name="region"
            required
            defaultValue=""
            data-testid="region"
            className="border"
          >
            <option value="" disabled>
              Choose region
            </option>
            {userRegions.map((region) => (
              <option key={region} value={region}>
                {region}
              </option>
            ))}
          </select>
        </label>
*/
// Finish your profile page on Figma does not have the Sign out button --> will ask TLs since PR says the sign out button stays

