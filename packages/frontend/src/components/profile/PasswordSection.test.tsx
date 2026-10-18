import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PasswordSection } from "@frontend/components/profile/PasswordSection.tsx";
import { usePasswordChange } from "@frontend/hooks/use-password-change.ts";

const isCurrentPassword = vi.fn<(password: string) => Promise<boolean>>();
const sendPasswordReset = vi.fn<() => Promise<string>>();
const changePassword =
  vi.fn<
    (input: { currentPassword: string; newPassword: string }) => Promise<void>
  >();

vi.mock("@frontend/lib/passwordChange.ts", () => ({
  isCurrentPassword: (password: string) => isCurrentPassword(password),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    changePassword(input),
  sendPasswordReset: () => sendPasswordReset(),
  isWrongPassword: () => false,
}));

function Harness() {
  const password = usePasswordChange();
  return <PasswordSection password={password} onCancel={password.reset} />;
}

function renderSection() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <Harness />
    </QueryClientProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Change Password" }));
}

const field = (testId: string) => screen.getByTestId(testId);
const type = (testId: string, value: string) => {
  fireEvent.focus(field(testId));
  fireEvent.change(field(testId), { target: { value } });
};
const settle = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  isCurrentPassword.mockReset();
  changePassword.mockReset();
  sendPasswordReset.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("old password", () => {
  it("is checked once typing pauses, not on every keystroke", async () => {
    isCurrentPassword.mockResolvedValue(true);
    renderSection();

    type("oldPassword", "o");
    type("oldPassword", "ol");
    type("oldPassword", "old");
    await settle(900);
    expect(isCurrentPassword).not.toHaveBeenCalled();

    await settle(200);
    expect(isCurrentPassword).toHaveBeenCalledTimes(1);
    expect(isCurrentPassword).toHaveBeenCalledWith("old");
    expect(field("oldPassword")).toHaveAttribute("data-valid", "true");
  });

  it("is checked straight away when the user leaves the field", async () => {
    isCurrentPassword.mockResolvedValue(true);
    renderSection();

    type("oldPassword", "old");
    fireEvent.blur(field("oldPassword"));
    await settle(0);

    expect(isCurrentPassword).toHaveBeenCalledTimes(1);
    expect(field("oldPassword")).toHaveAttribute("data-valid", "true");
  });

  it("is marked invalid when it is wrong", async () => {
    isCurrentPassword.mockResolvedValue(false);
    renderSection();

    type("oldPassword", "wrong");
    await settle(1000);

    expect(field("oldPassword")).toHaveAttribute("aria-invalid", "true");
    expect(field("oldPassword")).toHaveAttribute("data-valid", "false");
  });

  it("is marked invalid when it can't be checked", async () => {
    isCurrentPassword.mockRejectedValue(new Error("offline"));
    renderSection();

    type("oldPassword", "old");
    await settle(1000);

    expect(field("oldPassword")).toHaveAttribute("aria-invalid", "true");
  });

  it("is not trusted once it is edited after a check", async () => {
    isCurrentPassword.mockResolvedValue(true);
    renderSection();
    type("oldPassword", "old");
    await settle(1000);

    type("oldPassword", "olds");

    expect(field("oldPassword")).toHaveAttribute("data-valid", "false");
  });
});

describe("typed passwords", () => {
  it("turn off the phone keyboard's capitalizing and autocorrect", () => {
    renderSection();

    for (const testId of ["oldPassword", "newPassword", "confirmPassword"]) {
      expect(field(testId)).toHaveAttribute("autocapitalize", "none");
      expect(field(testId)).toHaveAttribute("autocorrect", "off");
    }
  });

  it("show while typing and as x's after leaving the field", () => {
    renderSection();

    type("newPassword", "hunter2hunter2");
    expect(field("newPassword")).toHaveValue("hunter2hunter2");

    fireEvent.blur(field("newPassword"));
    expect(field("newPassword")).toHaveValue("xxxxxxxxxxxxxx");

    fireEvent.focus(field("newPassword"));
    expect(field("newPassword")).toHaveValue("hunter2hunter2");
  });
});

describe("new password", () => {
  it("lists the requirements once it is left too short", () => {
    renderSection();

    type("newPassword", "short");
    expect(screen.queryByText(/Minimum/)).not.toBeInTheDocument();

    fireEvent.blur(field("newPassword"));
    expect(
      screen.getByText(
        "Please add all necessary characters to create safe password.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Minimum/)).toHaveTextContent(
      "Minimum 8 characters",
    );
    expect(field("newPassword")).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps listing them while the user types again, until it is long enough", () => {
    renderSection();
    type("newPassword", "short");
    fireEvent.blur(field("newPassword"));
    expect(screen.getByText(/Minimum/)).toBeInTheDocument();

    type("newPassword", "");
    type("newPassword", "sho");
    expect(screen.getByText(/Minimum/)).toBeInTheDocument();
    expect(field("newPassword")).toHaveAttribute("aria-invalid", "true");

    type("newPassword", "long enough");
    expect(screen.queryByText(/Minimum/)).not.toBeInTheDocument();
  });

  it("drops the requirements once it is long enough", () => {
    renderSection();
    type("newPassword", "short");
    fireEvent.blur(field("newPassword"));

    type("newPassword", "long enough");

    expect(screen.queryByText(/Minimum/)).not.toBeInTheDocument();
    expect(field("newPassword")).toHaveAttribute("aria-invalid", "false");
  });
});

describe("confirm password", () => {
  it("is marked invalid when it differs from the new password", () => {
    renderSection();
    type("newPassword", "long enough");
    type("confirmPassword", "long enougX");
    fireEvent.blur(field("confirmPassword"));

    expect(field("confirmPassword")).toHaveAttribute("aria-invalid", "true");

    type("confirmPassword", "long enough");
    expect(field("confirmPassword")).toHaveAttribute("aria-invalid", "false");
  });

  it("stays invalid while the user types again, until it matches", () => {
    renderSection();
    type("newPassword", "long enough");
    type("confirmPassword", "nope");
    fireEvent.blur(field("confirmPassword"));

    type("confirmPassword", "long");
    expect(field("confirmPassword")).toHaveAttribute("aria-invalid", "true");

    type("confirmPassword", "long enough");
    expect(field("confirmPassword")).toHaveAttribute("aria-invalid", "false");
  });
});

describe("saving", () => {
  async function fillValidForm() {
    isCurrentPassword.mockResolvedValue(true);
    renderSection();
    type("oldPassword", "old password");
    await settle(1000);
    type("newPassword", "new password");
    type("confirmPassword", "new password");
  }

  it("needs a verified old password and matching new ones", async () => {
    isCurrentPassword.mockResolvedValue(true);
    renderSection();
    const save = screen.getByRole("button", { name: "Save Password" });
    expect(save).toBeDisabled();

    type("newPassword", "new password");
    type("confirmPassword", "new password");
    expect(save).toBeDisabled();

    type("oldPassword", "old password");
    await settle(1000);
    expect(save).toBeEnabled();

    type("confirmPassword", "different");
    expect(save).toBeDisabled();
  });

  it("changes the password and returns to the closed card", async () => {
    changePassword.mockResolvedValue();
    await fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));
    await settle(0);

    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: "old password",
      newPassword: "new password",
    });
    expect(
      screen.getByRole("button", { name: "Change Password" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("oldPassword")).not.toBeInTheDocument();
  });

  it("stays open with a message when it fails", async () => {
    changePassword.mockRejectedValue(new Error("offline"));
    await fillValidForm();

    fireEvent.click(screen.getByRole("button", { name: "Save Password" }));
    await settle(0);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn’t update your password. Try again.",
    );
    expect(field("newPassword")).toBeInTheDocument();
  });

  it("clears everything when cancelled", () => {
    renderSection();
    type("newPassword", "something");

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(field("newPassword")).toHaveValue("");
  });
});

describe("forgot password", () => {
  it("asks for a reset email and says where it went", async () => {
    sendPasswordReset.mockResolvedValue("ada@example.com");
    renderSection();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await settle(0);

    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Reset email sent to ada@example.com",
    );
  });

  it("can't be clicked again while the email is being sent", async () => {
    sendPasswordReset.mockReturnValue(new Promise<string>(() => {}));
    renderSection();
    const link = screen.getByRole("button", { name: "Forgot password?" });

    fireEvent.click(link);
    await settle(0);
    fireEvent.click(link);

    expect(link).toBeDisabled();
    expect(sendPasswordReset).toHaveBeenCalledTimes(1);
  });

  it("says so when the email couldn't be sent", async () => {
    sendPasswordReset.mockRejectedValue(new Error("offline"));
    renderSection();

    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await settle(0);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Couldn’t send the reset email. Try again.",
    );
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Forgot password?" }),
    ).toBeEnabled();
  });

  it("forgets the message once the form is closed", async () => {
    sendPasswordReset.mockResolvedValue("ada@example.com");
    renderSection();
    fireEvent.click(screen.getByRole("button", { name: "Forgot password?" }));
    await settle(0);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Change Password" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
