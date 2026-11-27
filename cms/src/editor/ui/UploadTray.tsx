import { useEffect, useState } from "react";
import { InDock } from "../workspace/Dock";
import "./uploads.css";
import { cancelUpload, dismissUpload, useUploads, type Upload } from "../uploads";
import { progressLabel } from "./upload-label";

/**
 * Bottom-right of the editor: one card per upload. While it goes, a progress bar, how much is
 * sent and roughly how long is left, and a Cancel button. After, it says "Uploaded" or
 * "Upload cancelled" for a few seconds; a failed upload stays until it's dismissed.
 */
export function UploadTray() {
  const uploads = useUploads();
  const live = uploads.some((u) => u.status === "uploading" || u.status === "preparing");
  // Tick once a second while something is sending, so "time left" counts down between progress events.
  const [, tick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [live]);
  // Leaving the editor mid-upload would lose it: ask first.
  useEffect(() => {
    if (!live) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [live]);
  if (!uploads.length) return null;
  const going = uploads.filter((u) => u.status === "uploading" || u.status === "preparing").length;
  return (
    <InDock slot="bottom" name="uploads">
    <section className="ed-uploads" aria-label="Uploads">
      <header className="ed-uploads-head">
        <span>{going ? `Uploading ${going} ${going === 1 ? "file" : "files"}` : "Uploads"}</span>
        {going > 1 ? (
          <button type="button" className="ed-uploads-all" onClick={() => uploads.forEach((u) => cancelUpload(u.id))}>
            Cancel all
          </button>
        ) : null}
      </header>
      <ul>
        {uploads.map((u) => (
          <UploadRow key={u.id} u={u} />
        ))}
      </ul>
    </section>
    </InDock>
  );
}

function UploadRow({ u }: { u: Upload }) {
  const going = u.status === "uploading" || u.status === "preparing";
  const pct = u.status === "done" ? 100 : u.total ? Math.min(100, Math.round((u.loaded / u.total) * 100)) : 0;
  return (
    <li className={`ed-upload is-${u.status}`} data-upload={u.status}>
      <div className="ed-upload-line">
        <span className="ed-upload-icon" aria-hidden="true">
          {u.status === "done" ? "✓" : u.status === "cancelled" ? "⨯" : u.status === "failed" ? "!" : "↑"}
        </span>
        <span className="ed-upload-name" title={u.name}>
          {u.name}
        </span>
        {going ? (
          <button type="button" className="ed-upload-cancel" onClick={() => cancelUpload(u.id)} aria-label={`Cancel uploading ${u.name}`}>
            Cancel
          </button>
        ) : (
          <button type="button" className="ed-mini" onClick={() => dismissUpload(u.id)} aria-label={`Dismiss ${u.name}`}>
            ×
          </button>
        )}
      </div>
      {going ? (
        <div
          className={`ed-upload-bar${u.status === "preparing" ? " is-waiting" : ""}`}
          role="progressbar"
          aria-label={`Uploading ${u.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={u.status === "preparing" ? undefined : pct}
        >
          <i style={{ width: u.status === "preparing" ? undefined : `${pct}%` }} />
        </div>
      ) : null}
      <p className="ed-upload-note" role={going ? undefined : u.status === "failed" ? "alert" : "status"}>
        {going ? (
          <>
            {u.status === "uploading" ? <b>{pct}%</b> : null} {progressLabel(u)}
          </>
        ) : u.status === "done" ? (
          "Uploaded to the media library"
        ) : u.status === "cancelled" ? (
          "Upload cancelled"
        ) : (
          u.error ?? "Upload failed."
        )}
      </p>
    </li>
  );
}
