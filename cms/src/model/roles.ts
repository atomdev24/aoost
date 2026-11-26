/**
 * Roles (ROADMAP, Nov 2026; publishing per the UI spec interview: teammates publish directly).
 *   viewer   look and comment
 *   editor   edit, publish
 *   manager  + elect variants into staging and push staging live, restore versions
 *   owner    + manage the team
 */
export const ROLES = ["viewer", "editor", "manager", "owner"] as const;
export type Role = (typeof ROLES)[number];
export type Action = "comment" | "edit" | "publish" | "promote" | "team";

const MIN: Record<Action, Role> = { comment: "viewer", edit: "editor", publish: "editor", promote: "manager", team: "owner" };
export const can = (role: Role, action: Action) => ROLES.indexOf(role) >= ROLES.indexOf(MIN[action]);
export const isRole = (v: unknown): v is Role => typeof v === "string" && (ROLES as readonly string[]).includes(v);

export const ROLE_LABEL: Record<Role, string> = { viewer: "Viewer", editor: "Editor", manager: "Manager", owner: "Owner" };
export const ROLE_HINT: Record<Role, string> = {
  viewer: "Looks and comments",
  editor: "Edits and publishes",
  manager: "Also elects variants and pushes staging live",
  owner: "Also manages the team",
};

/** What an editor API call needs ("POST /ops" → edit). Reads need nothing. */
export function actionFor(route: string): Action | null {
  const [method, path] = route.split(" ") as [string, string];
  if (method === "GET") return null;
  if (path === "/comments") return "comment";
  if (path === "/publish") return "publish";
  if (path === "/staging" || path === "/staging/push") return "promote";
  // Scheduling a release, cancelling it or undoing it: the same as pushing live.
  if (path === "/release" || path === "/release/undo") return "promote";
  if (path === "/team") return "team";
  // The demo's settings: Managers and Owners.
  if (path === "/demo/settings" || path === "/demo/reset-now") return "promote";
  // Fetching visitor numbers uses Clarity's small daily allowance: Managers and Owners.
  if (path === "/insights/fetch") return "promote";
  return "edit";
}

export type Team = Record<string, Role>;

/** Clean a team list from the editor: lower-case emails, known roles, at most 200 people. */
export function cleanTeam(input: unknown): Team {
  const out: Team = {};
  if (!input || typeof input !== "object") return out;
  for (const [email, role] of Object.entries(input as Record<string, unknown>).slice(0, 200)) {
    const e = email.trim().toLowerCase();
    // A person ("jess@aerobotics.com") or everyone at a domain ("*@aerobotics.com").
    if (/^([^@\s*]+|\*)@[^@\s*]+\.[^@\s*]+$/.test(e) && isRole(role)) out[e] = role;
  }
  return out;
}

/**
 * Someone's role. The editor password (and the Claude connector's bearer token) is the owner's key.
 * With Google sign-in (Cloudflare Access) the email decides: OWNER_EMAILS first, then the team
 * list, then a "*@domain" entry in it, else the default role. With no owners and no team set up
 * yet, everyone signed in is an owner, so switching roles on never locks anyone out.
 */
export function roleFor(id: { via: string; who: string }, opts: { owners: string[]; team: Team; fallback: Role }): Role {
  if (id.via !== "access") return "owner";
  // Until anyone sets up a team, everyone who gets past sign-in is an owner (as before roles).
  if (!opts.owners.length && !Object.keys(opts.team).length) return "owner";
  const email = id.who.trim().toLowerCase();
  if (opts.owners.includes(email)) return "owner";
  if (opts.team[email]) return opts.team[email]!;
  const domain = email.split("@")[1];
  if (domain && opts.team[`*@${domain}`]) return opts.team[`*@${domain}`]!;
  return opts.fallback;
}

/** Saving the team never takes the saver's own ownership away (so an owner can't lock themselves out). */
export function keepSaverOwner(team: Team, saver: { via: string; who: string }, owners: string[]): Team {
  if (saver.via !== "access") return team;
  const email = saver.who.trim().toLowerCase();
  if (!email.includes("@") || owners.includes(email)) return team;
  return { ...team, [email]: "owner" };
}
