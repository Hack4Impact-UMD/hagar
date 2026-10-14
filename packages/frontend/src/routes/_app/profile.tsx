import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ProfileField } from "@frontend/components/profile/ProfileField.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { data: profile } = useQuery(trpc.me.queryOptions());

  // The route guard only lets complete profiles in, but the type can't know
  // that: the details are null while the stage is 'PROFILE SETUP'.
  if (!profile || profile.stage === "PROFILE SETUP") return null;

  return (
    <main>
      <h1 data-testid="profile">My Profile</h1>
      <section>
        <h2>
          {profile.firstName} {profile.lastName}
        </h2>
        <p>{profile.role}</p>
        <p>{profile.email}</p>
      </section>
      <section>
        <h2>Personal Information</h2>
        <dl>
          <ProfileField label="First Name" value={profile.firstName} />
          <ProfileField label="Last Name" value={profile.lastName} />
          <ProfileField label="Email Address" value={profile.email} />
          <ProfileField label="Phone Number" value={profile.phoneNumber} />
          <ProfileField label="User Role" value={profile.role} />
        </dl>
      </section>
      <section>
        <h2>Address</h2>
        <dl>
          <ProfileField label="Region" value={profile.region} />
        </dl>
      </section>
    </main>
  );
}
