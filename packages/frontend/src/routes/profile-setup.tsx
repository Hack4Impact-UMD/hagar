import type { UserRegion } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ProfilePhotoPicker } from "@frontend/components/profile-setup/profile-photo-picker.tsx";
import { RegionSelect } from "@frontend/components/profile-setup/region-select.tsx";
import {
  validateProfileForm,
  type ProfileFormErrors,
} from "@frontend/components/profile-setup/validation.ts";
import { Input } from "@frontend/components/ui/input.tsx";
import { Label } from "@frontend/components/ui/label.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import { uploadProfilePhoto } from "@frontend/lib/profilePhotos.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/profile-setup")({
  component: ProfileSetup,
});

function ProfileSetup() {
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [region, setRegion] = useState<UserRegion | "">("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ProfileFormErrors>({});

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

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const formPhoto = form.get("photo");
    const fileToUpload =
      photo ??
      (formPhoto instanceof File && formPhoto.size > 0 ? formPhoto : null);

    const errors = validateProfileForm({
      firstName,
      lastName,
      phoneNumber,
      region,
      photo: fileToUpload,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    if (!fileToUpload || !region) return;
    setFieldErrors({});

    uploadPhoto.mutate(fileToUpload, {
      onSuccess: (photoPath) =>
        completeProfile.mutate({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          photoPath,
          region,
        }),
    });
  };

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Finish your profile</h1>
      <form noValidate className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            name="firstName"
            type="text"
            required
            maxLength={500}
            data-testid="firstName"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (fieldErrors.firstName) {
                setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
              }
            }}
          />
          {fieldErrors.firstName && (
            <p role="alert" className="text-sm text-red-600">
              {fieldErrors.firstName}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            name="lastName"
            type="text"
            required
            maxLength={500}
            data-testid="lastName"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (fieldErrors.lastName) {
                setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
              }
            }}
          />
          {fieldErrors.lastName && (
            <p role="alert" className="text-sm text-red-600">
              {fieldErrors.lastName}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="phoneNumber">Phone number</Label>
          <Input
            id="phoneNumber"
            name="phoneNumber"
            type="tel"
            required
            maxLength={100}
            data-testid="phoneNumber"
            value={phoneNumber}
            onChange={(e) => {
              setPhoneNumber(e.target.value);
              if (fieldErrors.phoneNumber) {
                setFieldErrors((prev) => ({ ...prev, phoneNumber: undefined }));
              }
            }}
          />
          {fieldErrors.phoneNumber && (
            <p role="alert" className="text-sm text-red-600">
              {fieldErrors.phoneNumber}
            </p>
          )}
        </div>

        <ProfilePhotoPicker
          file={photo}
          error={fieldErrors.photo}
          onFileSelect={(selectedFile, err) => {
            setPhoto(selectedFile);
            setFieldErrors((prev) => ({
              ...prev,
              photo: err ?? undefined,
            }));
          }}
        />

        <RegionSelect
          value={region}
          error={fieldErrors.region}
          onChange={(selectedRegion) => {
            setRegion(selectedRegion);
            if (fieldErrors.region) {
              setFieldErrors((prev) => ({ ...prev, region: undefined }));
            }
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

