import { UploadTray } from "../parts";
import { useUploads } from "../uploads";

/** Loads the upload tray (progress bars, Cancel) only once something is uploading. */
export function UploadTrayHost() {
  return useUploads().length ? <UploadTray /> : null;
}
