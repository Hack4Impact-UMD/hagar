import type { UserRegion } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { FormField } from "@frontend/components/form/FormField.tsx";
import { SubmitButton } from "@frontend/components/form/SubmitButton.tsx";
import { ProfilePhotoPicker } from "@frontend/components/profile-setup/profile-photo-picker.tsx";
import { validateProfileForm } from "@frontend/components/profile-setup/profile-validation.ts";
import type { ProfileFormErrors } from "@frontend/components/profile-setup/profile-validation.ts";
import { RegionSelect } from "@frontend/components/profile-setup/region-select.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { auth } from "@frontend/lib/firebase.ts";
import { uploadProfilePhoto } from "@frontend/lib/profilePhotos.ts";
import { queryClient, trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/profile-setup")({
  component: ProfileSetup,
});

// Matches the other fields' height and border in the design. Auth pages use
// the shorter defaults.
const FIELD_STYLE = "sm:h-17.5 border-2 border-field-border";

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
      // Store the profile with its new stage, then re-run the route guards
      // so they send the user to that stage's page.
      onSuccess: async (profile) => {
        queryClient.setQueryData(trpc.me.queryKey(), profile);
        await router.invalidate();
      },
    }),
  );
  const uploadPhoto = useMutation({ mutationFn: uploadProfilePhoto });
  const isPending = uploadPhoto.isPending || completeProfile.isPending;
  const error = uploadPhoto.error ?? completeProfile.error;

  const clearError = (field: keyof ProfileFormErrors) =>
    setFieldErrors((prev) =>
      prev[field] ? { ...prev, [field]: undefined } : prev,
    );

  const handleSubmit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors = validateProfileForm({
      firstName,
      lastName,
      phoneNumber,
      region,
      photo,
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Validation guarantees both, but TypeScript can't see through it.
    if (!photo || !region) return;
    setFieldErrors({});

    uploadPhoto.mutate(photo, {
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
    <main className="min-h-screen bg-background text-[#1C1917]">
      <header className="px-7 pt-9">
        <img
          src="/logo.png"
          alt="Hagar Logo"
          className="h-17 w-38.25 object-contain"
        />
      </header>

      {/* Capped and centered so the heading, photo and fields stay together
          instead of spreading apart on wide screens. */}
      <div className="mx-auto max-w-350 px-8 pt-8 pb-12 md:px-16 lg:px-25 lg:pt-15.75">
        <div className="mb-15.75">
          <h1 className="text-[2.5em] font-bold">Finish your profile</h1>
          <p className="mt-2 text-lg">You can change this later.</p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="grid grid-cols-1 items-start gap-26.75 lg:grid-cols-[16.875rem_1fr] lg:pl-12"
        >
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

          <div className="flex flex-col">
            <div className="grid grid-cols-1 gap-x-13 gap-y-6 sm:grid-cols-2">
              <FormField
                label="First name"
                name="firstName"
                type="text"
                maxLength={500}
                data-testid="firstName"
                value={firstName}
                error={fieldErrors.firstName}
                className={FIELD_STYLE}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  clearError("firstName");
                }}
              />
              <FormField
                label="Last name"
                name="lastName"
                type="text"
                maxLength={500}
                data-testid="lastName"
                value={lastName}
                error={fieldErrors.lastName}
                className={FIELD_STYLE}
                onChange={(e) => {
                  setLastName(e.target.value);
                  clearError("lastName");
                }}
              />
              <RegionSelect
                value={region}
                error={fieldErrors.region}
                onChange={(selectedRegion) => {
                  setRegion(selectedRegion);
                  clearError("region");
                }}
              />
              <FormField
                label="Phone number"
                name="phoneNumber"
                type="tel"
                maxLength={100}
                data-testid="phoneNumber"
                value={phoneNumber}
                error={fieldErrors.phoneNumber}
                className={FIELD_STYLE}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  clearError("phoneNumber");
                }}
              />
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error.message}
              </p>
            ) : null}

            <div className="mt-18.5 flex items-center justify-end gap-6">
              <Button
                type="button"
                variant="ghost"
                data-testid="sign-out"
                onClick={() => void auth.signOut()}
                className="cursor-pointer text-base text-muted-foreground"
              >
                Sign out
              </Button>
              <SubmitButton
                pending={isPending}
                data-testid="next"
                className="w-58.75 font-semibold"
              >
                Finish profile
              </SubmitButton>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
