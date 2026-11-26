import { useEffect, useState } from "react";
import { embedFor } from "../../components/Embed/providers";
import { registerMediaPicker, type MediaKind } from "../fields/media";
import { Modal } from "./kit";
import { MediaLibrary } from "../parts";

type Request = { kind: MediaKind; resolve: (url: string | null) => void };

/** Mounted once: opens the media library as a dialog whenever a "Choose" button asks for a file. */
export function MediaPickerHost() {
  const [request, setRequest] = useState<Request | null>(null);
  useEffect(() => {
    registerMediaPicker((kind) => new Promise((resolve) => setRequest({ kind, resolve })));
    return () => registerMediaPicker(null);
  }, []);
  if (!request) return null;
  const finish = (url: string | null) => {
    request.resolve(url);
    setRequest(null);
  };
  return (
    <Modal title={`Choose ${request.kind === "any" ? "a file" : request.kind === "image" ? "an image" : request.kind === "audio" ? "an audio file" : `a ${request.kind}`}`} onClose={() => finish(null)} wide>
      {request.kind === "video" ? <VideoLink onUse={finish} /> : null}
      <MediaLibrary kind={request.kind} onPick={(item) => finish(item.url)} />
    </Modal>
  );
}

/** Above the library when choosing a video: paste a YouTube or Vimeo link instead. */
function VideoLink({ onUse }: { onUse: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const info = url.trim() ? embedFor(url.trim()) : null;
  const ok = !!info && (info.provider === "youtube" || info.provider === "vimeo");
  const use = () => ok && onUse(url.trim());
  return (
    <div className="ed-pick-link">
      <label htmlFor="ed-pick-link">Paste a YouTube or Vimeo link</label>
      <div className="ed-pick-link-row">
        <input id="ed-pick-link" className="ed-input" type="url" placeholder="https://youtu.be/…" value={url} autoFocus onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && use()} />
        <button type="button" className="ed-btn ed-btn-sm ed-btn-primary" disabled={!ok} onClick={use}>
          Use link
        </button>
      </div>
      <p className="ed-pick-link-or">{url.trim() && !ok ? "That isn't a YouTube or Vimeo link." : "Or choose a video file below."}</p>
    </div>
  );
}
