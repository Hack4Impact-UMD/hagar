import { expect, test } from "@playwright/test";
import { createUser, latestOobCode } from "@e2e/emulator.ts";

// Its own account, so this test doesn't depend on the onboarding test's user.
const USER = {
  email: "reset@example.com",
  oldPassword: "oldpassword1",
  newPassword: "newpassword1",
};

test("resets a forgotten password from the emailed link", async ({ page }) => {
  await createUser(USER.email, USER.oldPassword);

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot Password?" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  // Routes load lazily, so wait for the page before typing into its field.
  await expect(
    page.getByRole("heading", { name: "Forgot password" }),
  ).toBeVisible();
  await page.getByTestId("email").fill(USER.email);
  await page.getByTestId("send-reset-link").click();

  await expect(page.getByTestId("reset-email-status")).toContainText(
    USER.email,
  );
  // The first send starts the resend cooldown.
  await expect(page.getByTestId("resend-reset")).toBeDisabled();
  await expect(page.getByTestId("resend-reset")).toHaveText(/Resend in \d+s/);

  // The emulator records the link's code instead of sending the email.
  const oobCode = await latestOobCode(USER.email, "PASSWORD_RESET");
  const link = `/auth-action?mode=resetPassword&oobCode=${oobCode}`;
  await page.goto(link);
  await expect(page.getByTestId("reset-account")).toHaveText(USER.email);
  await page.getByTestId("new-password").fill(USER.newPassword);
  await page.getByTestId("reset-password").click();

  await expect(page).toHaveURL(/\/login\?reset=1$/);
  await expect(page.getByTestId("password-updated")).toBeVisible();

  // Each link works once.
  await page.goto(link);
  await expect(page.getByTestId("expired-link")).toBeVisible();

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.getByTestId("email").fill(USER.email);
  await page.getByTestId("password").fill(USER.oldPassword);
  await page.getByTestId("log-in").click();
  await expect(page.getByRole("alert")).toHaveText(
    "Incorrect email or password.",
  );

  await page.getByTestId("password").fill(USER.newPassword);
  await page.getByTestId("log-in").click();
  // A new account with no profile yet continues to profile setup.
  await expect(page).toHaveURL(/\/profile-setup$/);
});
