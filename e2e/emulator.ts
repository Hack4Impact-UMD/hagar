export const PROJECT_ID = "hagar-intl";
export const REGION = "us-central1";
export const AUTH_HOST = "http://127.0.0.1:9099";
export const FIRESTORE_HOST = "http://127.0.0.1:8080";
export const FUNCTIONS_HOST = "http://127.0.0.1:5001";

export const TEST_USER = {
  email: "e2e@example.com",
  password: "password123",
};

/** Resolves once an emulator answers, so setup never races the boot. */
export async function waitForEmulator(url: string, timeoutMs = 180_000) {
  await poll(
    async () => {
      await fetch(url);
      return true;
    },
    timeoutMs,
    `Emulator at ${url} did not start`,
  );
}

/**
 * The first call into the Functions emulator pays a container cold start of
 * several seconds. Paying it here keeps that latency out of the tests.
 */
export async function warmFunction(timeoutMs = 180_000) {
  const url = `${FUNCTIONS_HOST}/${PROJECT_ID}/${REGION}/api/api/health`;
  await poll(
    async () => {
      const response = await fetch(url);
      return response.ok;
    },
    timeoutMs,
    `Function at ${url} did not become ready`,
  );
}

/** Clears users and documents so each run starts from a known state. */
export async function resetEmulators() {
  await fetch(`${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/accounts`, {
    method: "DELETE",
  });
  await fetch(
    `${FIRESTORE_HOST}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
    { method: "DELETE" },
  );
}

// The emulators treat this token as an admin, which bypasses security rules.
const OWNER = { Authorization: "Bearer owner" };

/**
 * Applies the most recent verification email sent to `email`, as if the user
 * had clicked its link. Waits for the email, since the app sends it
 * asynchronously.
 */
export async function verifyEmail(email: string, timeoutMs = 15_000) {
  let oobCode: string | undefined;
  await poll(
    async () => {
      const response = await fetch(
        `${AUTH_HOST}/emulator/v1/projects/${PROJECT_ID}/oobCodes`,
      );
      const { oobCodes } = (await response.json()) as {
        oobCodes: { email: string; requestType: string; oobCode: string }[];
      };
      oobCode = oobCodes
        .filter((code) => code.email === email)
        .findLast((code) => code.requestType === "VERIFY_EMAIL")?.oobCode;
      return oobCode !== undefined;
    },
    timeoutMs,
    `No verification email for ${email}`,
  );

  await expectOk(
    fetch(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:update?key=fake-api-key`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oobCode }),
      },
    ),
  );
}

/** Stands in for an admin approving the account, which has no UI yet. */
export async function approveUser(email: string) {
  const lookup = await expectOk(
    fetch(
      `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}/accounts:lookup`,
      {
        method: "POST",
        headers: { ...OWNER, "Content-Type": "application/json" },
        body: JSON.stringify({ email: [email] }),
      },
    ),
  );
  const { users } = (await lookup.json()) as { users: { localId: string }[] };
  const uid = users[0]?.localId;
  if (!uid) throw new Error(`No account for ${email}`);

  await expectOk(
    fetch(
      `${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=stage`,
      {
        method: "PATCH",
        headers: { ...OWNER, "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { stage: { stringValue: "ACTIVE" } } }),
      },
    ),
  );
}

async function expectOk(request: Promise<Response>) {
  const response = await request;
  if (!response.ok) {
    throw new Error(
      `${response.url} returned ${response.status}: ${await response.text()}`,
    );
  }
  return response;
}

async function poll(
  attempt: () => Promise<boolean>,
  timeoutMs: number,
  message: string,
) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      if (await attempt()) return;
    } catch {
      // The emulator is not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${message} within ${timeoutMs}ms`);
}
