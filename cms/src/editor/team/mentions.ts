import { api } from "../api";

let people: string[] | null = null;

/** Teammates' emails (not "*@domain" entries), fetched once per session for @mentions. */
export async function teamPeople(): Promise<string[]> {
  if (people) return people;
  try {
    const r = await api.team();
    people = ["claude", ...r.owners, ...Object.keys(r.team)].filter((e) => !e.startsWith("*@"));
  } catch {
    people = ["claude"];
  }
  return people;
}

export { completeMention, mentionQuery } from "./mention-text";
