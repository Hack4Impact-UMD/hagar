import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { changedFields } from "@frontend/components/profile/changedFields.ts";
import { ProfileAvatar } from "@frontend/components/profile/ProfileAvatar.tsx";
import { ProfileField } from "@frontend/components/profile/ProfileField.tsx";
import { ProfileSection } from "@frontend/components/profile/ProfileSection.tsx";
import { Button } from "@frontend/components/ui/button.tsx";
import { trpc } from "@frontend/lib/trpc.ts";

export const Route = createFileRoute("/_app/profile")({ component: Profile });

function Profile() {
  const { data: profile } = useQuery(trpc.me.queryOptions());
  const [editing, setEditing] = useState(false);

  // Leaving edit mode unmounts the inputs, which discards their drafts.
  useEffect(() => {
    if (!editing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditing(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [editing]);

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
        if (Object.keys(changes).length === 0) setEditing(false);
      }}
    >
      <main>
        <header>
          <h1 data-testid="profile">My Profile</h1>
          {/* Separate keys give each mode its own button element. Reusing one
              and flipping its type would let the click that enters edit mode
              also submit the form. */}
          {editing ? (
            <Button key="save" type="submit">
              Save Changes
            </Button>
          ) : (
            <Button key="edit" type="button" onClick={startEditing}>
              Edit Profile
            </Button>
          )}
        </header>
        <section>
          <ProfileAvatar
            photoPath={profile.photoPath}
            firstName={profile.firstName}
            lastName={profile.lastName}
          />
          <h2>
            {profile.firstName} {profile.lastName}
          </h2>
          <p>{profile.role}</p>
          <p>{profile.email}</p>
        </section>
        <ProfileSection
          title="Personal Information"
          onEdit={editing ? undefined : startEditing}
        >
          <dl>
            <ProfileField
              label="First Name"
              value={profile.firstName}
              input={{ name: "firstName", type: "text" }}
              editing={editing}
            />
            <ProfileField
              label="Last Name"
              value={profile.lastName}
              input={{ name: "lastName", type: "text" }}
              editing={editing}
            />
            <ProfileField label="Email Address" value={profile.email} />
            <ProfileField
              label="Phone Number"
              value={profile.phoneNumber}
              input={{ name: "phoneNumber", type: "tel" }}
              editing={editing}
            />
            <ProfileField label="User Role" value={profile.role} />
          </dl>
        </ProfileSection>
        <ProfileSection
          title="Address"
          onEdit={editing ? undefined : startEditing}
        >
          <dl>
            <ProfileField label="Region" value={profile.region} />
          </dl>
        </ProfileSection>
      </main>
    </form>
  );
}
