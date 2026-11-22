import { afterEach, describe, expect, it, vi } from "vitest";
import { _resetUploads, cancelUpload, getUploads, LINGER_MS, startUpload, updateUpload, type Upload } from "./uploads";
import { progressLabel } from "./ui/upload-label";

afterEach(() => {
  _resetUploads();
  vi.useRealTimers();
});

const MB = 1024 * 1024;

describe("upload tray state", () => {
  it("cancel stops the upload, says cancelled, then clears after a few seconds", () => {
    vi.useFakeTimers();
    const stop = vi.fn();
    const id = startUpload("clip.mp4", 40 * MB, stop);
    updateUpload(id, { status: "uploading", loaded: 10 * MB, total: 40 * MB });
    cancelUpload(id);
    expect(stop).toHaveBeenCalledOnce();
    expect(getUploads()[0]).toMatchObject({ status: "cancelled" });
    // a second click does nothing more
    cancelUpload(id);
    expect(stop).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(LINGER_MS.cancelled + 10);
    expect(getUploads()).toHaveLength(0);
  });

  it("a finished upload lingers briefly; a failed one stays until dismissed", () => {
    vi.useFakeTimers();
    const ok = startUpload("a.png", MB, () => {});
    const bad = startUpload("b.png", MB, () => {});
    updateUpload(ok, { status: "done" });
    updateUpload(bad, { status: "failed", error: "nope" });
    vi.advanceTimersByTime(LINGER_MS.done + 10);
    expect(getUploads().map((u) => u.name)).toEqual(["b.png"]);
    cancelUpload(bad); // can't cancel a failed one
    expect(getUploads()[0]!.status).toBe("failed");
  });
});

describe("progress label", () => {
  const u = (p: Partial<Upload>): Upload => ({ id: "x", name: "x", total: 80 * MB, loaded: 0, status: "uploading", ...p });
  it("shows sent of total, then time left once it has a rate", () => {
    expect(progressLabel(u({ status: "preparing" }))).toBe("Getting it ready…");
    expect(progressLabel(u({ loaded: 8 * MB, sendingSince: 1000 }), 1500)).toBe("8.0 MB of 80.0 MB");
    // 20 MB in 10 s → 60 MB left at 2 MB/s = 30 s
    expect(progressLabel(u({ loaded: 20 * MB, sendingSince: 0 }), 10_000)).toBe("20.0 MB of 80.0 MB · about 30 s left");
    // 8 MB in 10 s → 72 MB left = 90 s
    expect(progressLabel(u({ loaded: 8 * MB, sendingSince: 0 }), 10_000)).toBe("8.0 MB of 80.0 MB · about 2 min left");
    expect(progressLabel(u({ loaded: 80 * MB, sendingSince: 0 }), 10_000)).toBe("80.0 MB of 80.0 MB · finishing…");
  });
});
