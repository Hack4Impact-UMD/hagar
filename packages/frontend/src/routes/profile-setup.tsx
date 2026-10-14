import { userRegions } from "@repo/common";
import type { UserRegion } from "@repo/common";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { auth } from "@frontend/lib/firebase.ts";
import {
  PROFILE_PHOTO_ACCEPT,
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

  return (
    <main className="flex flex-col gap-4 p-6">
      <h1>Finish your profile</h1>
      <form
        className="flex flex-col gap-2"
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
      
    </main>
  );

  // my notes: routes when user clicks the finish profile button, then goes to the verify-email page --> this logic is already implemented.

  //       <button
  /* type="button"
  data-testid="sign-out"
  onClick={() => void auth.signOut()}
  className="self-start border px-3 py-1"
>
  Sign out
</button> */ 
// Finish your profile page on Figma does not have the Sign out button 
}
