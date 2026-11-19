import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCooldown } from "@frontend/hooks/use-cooldown.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useCooldown", () => {
  it("is idle until started", () => {
    const { result } = renderHook(() => useCooldown(15));
    expect(result.current.secondsLeft).toBe(0);
  });

  it("counts down in whole seconds and stops at zero", () => {
    const { result } = renderHook(() => useCooldown(15));
    act(() => result.current.start());
    expect(result.current.secondsLeft).toBe(15);

    act(() => vi.advanceTimersByTime(2_600));
    expect(result.current.secondsLeft).toBe(13);

    act(() => vi.advanceTimersByTime(12_400));
    expect(result.current.secondsLeft).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("restarts from the full length when started again", () => {
    const { result } = renderHook(() => useCooldown(15));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(10_000));
    act(() => result.current.start());
    expect(result.current.secondsLeft).toBe(15);
  });

  it("clears its timer on unmount", () => {
    const { result, unmount } = renderHook(() => useCooldown(15));
    act(() => result.current.start());
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
