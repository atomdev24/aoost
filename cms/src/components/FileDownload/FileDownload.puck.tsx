import type { Fields } from "@puckeditor/core";
import { mediaField } from "../../editor/fields/media";
import type { FileDownloadContent } from "./FileDownload";

export const fields: Fields<FileDownloadContent> = {
  src: mediaField("File (PDF, zip, …)", "file"),
  label: { type: "text", label: "Label" },
  note: { type: "text", label: "Note (e.g. size or what is inside)" },
};
