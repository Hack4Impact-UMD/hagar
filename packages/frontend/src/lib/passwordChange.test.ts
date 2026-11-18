import { beforeEach, describe, expect, it, vi } from "vitest";

type AuthCall = (...args: unknown[]) => Promise<unknown>;
const reauthenticateWithCredential = vi.fn<AuthCall>();
const updatePassword = vi.fn<AuthCall>();
const sendPasswordResetEmail = vi.fn<AuthCall>();

vi.mock("firebase/auth", () => ({
  EmailAuthProvider: {
    credential: (email: string, password: string) => ({ email, password }),
  },
  reauthenticateWithCredential: (...args: unknown[]) =>
    reauthenticateWithCredential(...args),
  updatePassword: (...args: unknown[]) => updatePassword(...args),
  sendPasswordResetEmail: (...args: unknown[]) =>
    sendPasswordResetEmail(...args),
}));
vi.mock("@frontend/lib/firebase.ts", () => ({
  auth: { currentUser: { email: "ada@example.com" } },
}));

const { changePassword, isCurrentPassword, sendPasswordReset } =
  await import("@frontend/lib/passwordChange.ts");

beforeEach(() => {
  reauthenticateWithCredential.mockReset();
  updatePassword.mockReset();
  sendPasswordResetEmail.mockReset();
});

describe("isCurrentPassword", () => {
  it("is true when Firebase accepts the password", async () => {
    reauthenticateWithCredential.mockResolvedValue({});
    await expect(isCurrentPassword("right")).resolves.toBe(true);
  });

  it("is false for either wrong-password code", async () => {
    for (const code of ["auth/wrong-password", "auth/invalid-credential"]) {
      reauthenticateWithCredential.mockRejectedValue({ code });
      await expect(isCurrentPassword("wrong")).resolves.toBe(false);
    }
  });

  it("throws for failures that say nothing about the password", async () => {
    reauthenticateWithCredential.mockRejectedValue({
      code: "auth/too-many-requests",
    });
    await expect(isCurrentPassword("guess")).rejects.toMatchObject({
      code: "auth/too-many-requests",
    });
  });
});

describe("changePassword", () => {
  it("checks the current password before updating", async () => {
    reauthenticateWithCredential.mockResolvedValue({});
    updatePassword.mockResolvedValue(null);
    await changePassword({
      currentPassword: "old",
      newPassword: "newpassword",
    });
    expect(updatePassword).toHaveBeenCalledWith(
      expect.anything(),
      "newpassword",
    );
  });

  it("does not update when the current password is wrong", async () => {
    reauthenticateWithCredential.mockRejectedValue({
      code: "auth/wrong-password",
    });
    await expect(
      changePassword({ currentPassword: "old", newPassword: "newpassword" }),
    ).rejects.toBeDefined();
    expect(updatePassword).not.toHaveBeenCalled();
  });
});

describe("sendPasswordReset", () => {
  it("emails the signed-in user", async () => {
    sendPasswordResetEmail.mockResolvedValue(null);
    await expect(sendPasswordReset()).resolves.toBe("ada@example.com");
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      expect.anything(),
      "ada@example.com",
    );
  });
});
