import { describe, expect, it, vi } from "vitest";

vi.mock("firebase/storage", () => ({
  ref: vi.fn<() => void>(),
  uploadBytes: vi.fn<() => void>(),
  getDownloadURL: vi.fn<() => void>(),
}));
vi.mock("@frontend/lib/firebase.ts", () => ({ auth: {}, storage: {} }));

const { withCacheBuster } = await import("@frontend/lib/profilePhotos.ts");

describe("withCacheBuster", () => {
  const url =
    "https://firebasestorage.googleapis.com/v0/b/app/o/avatar?alt=media&token=abc";

  it("keeps what the URL already had", () => {
    const busted = new URL(withCacheBuster(url));

    expect(busted.pathname).toBe("/v0/b/app/o/avatar");
    expect(busted.searchParams.get("alt")).toBe("media");
    expect(busted.searchParams.get("token")).toBe("abc");
  });

  it("gives the URL a different parameter every time", () => {
    expect(withCacheBuster(url)).not.toBe(withCacheBuster(url));
  });
});
