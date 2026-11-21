/** Types for table.js (the projects table layout, shared by the site and the editor). */
export type TablePiece = { x: number; y: number; rot: number; w: number; h: number; s?: number };
export function rng(seed: number): () => number;
export function layoutTable(W: number, aspects: number[]): { H: number; pw: number; items: TablePiece[] };
export function separate(pieces: TablePiece[], W: number, H: number, opts?: { pinned?: number; gap?: number }): (TablePiece & { moved: boolean })[] & { stuck: number };
export function overlapping(a: TablePiece, b: TablePiece, slack?: number): boolean;
export function clearLayout(W: number, aspects: number[], scales?: number[]): { H: number; pw: number; items: TablePiece[] };
export function pieceTransform(x: number, y: number, rot: number, s?: number): string;
