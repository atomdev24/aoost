export type EditorMode = "simple" | "full";
/** Until someone chooses: Owners start in Full, everyone else in Simple. */
export const defaultMode = (role: string): EditorMode => (role === "owner" ? "full" : "simple");
