import { formatPhoneNumber } from "@repo/common";
import type { UserRegion } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { ProfilePhotoPicker } from "@frontend/components/profile-setup/profile-photo-picker.tsx";
import { validateProfileForm } from "@frontend/components/profile-setup/profile-validation.ts";
import type { ProfileFormErrors } from "@frontend/components/profile-setup/profile-validation.ts";
import { RegionSelect } from "@frontend/components/profile-setup/region-select.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
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
    <main className="min-h-screen bg-white">
      {/* figma shows 36px (pt-9), 28px (px-7) */}
      <header className="flex items-center justify-between px-7 pt-9">
        <div className="flex items-center">
          <img
            src="/logo.png"
            alt="Hagar Logo"
            className="h-17 w-38.25 object-contain"
          />
        </div>

        <Button
          type="button"
          variant="ghost"
          data-testid="sign-out"
          onClick={() => void auth.signOut()}
          className="text-sm text-gray-500 hover:text-[#1C1917]"
        >
          Sign out
        </Button>
      </header>

      <div className="px-8 pt-8 pb-12 md:px-16 lg:px-37 lg:pt-15.75">
        {/* shifts 48px left from 148px -> exact 100px Left position */}
        <div className="mb-15.75 lg:-ml-12">
          <h1 className="text-[2.5em] font-bold tracking-tight text-[#1C1917]">
            Finish your profile
          </h1>
          <p className="mt-2 text-lg text-[#1C1917]">
            You can change this later.
          </p>
        </div>

        <form
          noValidate
          onSubmit={handleSubmit}
          className="grid grid-cols-1 items-start gap-26.75 lg:grid-cols-[16.875rem_1fr]"
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
              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="firstName"
                  className="text-sm font-semibold text-[#1C1917]"
                >
                  First name
                </Label>
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
                      setFieldErrors((prev) => ({
                        ...prev,
                        firstName: undefined,
                      }));
                    }
                  }}
                  className="h-17.5 rounded-[0.625em] border-2 border-[#D9D9D9] px-4 text-base shadow-none"
                />
                {fieldErrors.firstName && (
                  <p role="alert" className="text-sm text-red-600">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="lastName"
                  className="text-sm font-semibold text-[#1C1917]"
                >
                  Last name
                </Label>
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
                      setFieldErrors((prev) => ({
                        ...prev,
                        lastName: undefined,
                      }));
                    }
                  }}
                  className="h-17.5 rounded-[0.625em] border-2 border-[#D9D9D9] px-4 text-base shadow-none"
                />
                {fieldErrors.lastName && (
                  <p role="alert" className="text-sm text-red-600">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>

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

              <div className="flex flex-col gap-2">
                <Label
                  htmlFor="phoneNumber"
                  className="text-sm font-semibold text-[#1C1917]"
                >
                  Phone number
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  required
                  maxLength={100}
                  data-testid="phoneNumber"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(formatPhoneNumber(e.target.value));
                    if (fieldErrors.phoneNumber) {
                      setFieldErrors((prev) => ({
                        ...prev,
                        phoneNumber: undefined,
                      }));
                    }
                  }}
                  className="h-17.5 rounded-[0.625em] border-2 border-[#D9D9D9] px-4 text-base shadow-none"
                />
                {fieldErrors.phoneNumber && (
                  <p role="alert" className="text-sm text-red-600">
                    {fieldErrors.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            {error ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {error.message}
              </p>
            ) : null}

            <div className="mt-18.5 flex justify-end">
              <Button
                type="submit"
                data-testid="next"
                disabled={isPending}
                className="h-17.5 w-58.75 cursor-pointer rounded-xl bg-[#C75C3B] text-base font-semibold text-white hover:bg-[#de9877]"
              >
                Finish profile
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}
