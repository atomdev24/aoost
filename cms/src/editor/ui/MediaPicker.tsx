import { useEffect, useState } from "react";
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
      <MediaLibrary kind={request.kind} onPick={(item) => finish(item.url)} />
    </Modal>
  );
}
