import { expect, test } from "@playwright/test";
import { approveUser, TEST_USER, verifyEmail } from "@e2e/emulator.ts";

test("takes a new user from sign up to the homepage", async ({ page }) => {
  // Signed out, every page leads to login.
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login$/);

  await page.getByRole("link", { name: "Sign up" }).click();
  await expect(page).toHaveURL(/\/signup$/);
  // Routes load lazily, so the URL changes before the page does. Login has
  // the same `email` field, which would otherwise receive the typing.
  await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
  await page.getByTestId("email").fill(TEST_USER.email);
  await page.getByTestId("password").fill(TEST_USER.password);
  await page.getByTestId("create-account").click();

  await expect(page).toHaveURL(/\/profile-setup$/);
  await page.getByTestId("firstName").fill("Ada");
  await page.getByTestId("lastName").fill("Lovelace");
  await page.getByTestId("phoneNumber").fill("+15555550100");
  await page.getByTestId("photoUrl").fill("https://example.com/ada.png");
  await page.getByTestId("region").selectOption("New Zealand");
  await page.getByTestId("next").click();

  // The page sends the verification email on arrival and polls until the
  // link is used.
  await expect(page).toHaveURL(/\/verify-email$/);
  await expect(page.getByTestId("verify-email-status")).toContainText(
    TEST_USER.email,
  );
  await verifyEmail(TEST_USER.email);

  await expect(page).toHaveURL(/\/awaiting-approval$/);
  await expect(page.getByTestId("awaiting-approval")).toHaveText(
    "Waiting for admin approval. Come back later once the admin approves you!",
  );

  // Onboarding pages are off limits once the user has moved past them, and
  // active-only pages are off limits until approval.
  await page.goto("/profile-setup");
  await expect(page).toHaveURL(/\/awaiting-approval$/);
  await page.goto("/user-management");
  await expect(page).toHaveURL(/\/awaiting-approval$/);

  await approveUser(TEST_USER.email);
  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByTestId("homepage")).toHaveText("Homepage");

  await page.getByRole("link", { name: "Profile" }).click();
  await expect(page.getByTestId("profile")).toHaveText("Profile");
  await page.getByRole("link", { name: "Back to homepage" }).click();
  await page.getByRole("link", { name: "User management" }).click();
  await expect(page.getByTestId("user-management")).toHaveText(
    "User management",
  );
  await page.getByRole("link", { name: "Back to homepage" }).click();

  await page.getByTestId("sign-out").click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();

  // An approved user goes straight to the homepage after logging in.
  await page.getByTestId("email").fill(TEST_USER.email);
  await page.getByTestId("password").fill(TEST_USER.password);
  await page.getByTestId("log-in").click();
  await expect(page.getByTestId("homepage")).toHaveText("Homepage");
});
