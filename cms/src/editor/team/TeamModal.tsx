import { useEffect, useState } from "react";
import { ROLE_HINT, ROLE_LABEL, ROLES, type Role, type Team } from "../../model/roles";
import { api } from "../api";
import { Button, Modal } from "../ui/kit";
import { useCan } from "./role";

/**
 * Team: who can do what. Owners add people by email (or everyone at a domain with *@domain) and
 * pick a role; everyone else sees the list. Roles only take effect with Google sign-in; with the
 * editor password, whoever has it is the owner.
 */
export function TeamModal({ onClose }: { onClose: () => void }) {
  const owner = useCan("team");
  const [team, setTeam] = useState<Team | null>(null);
  const [owners, setOwners] = useState<string[]>([]);
  const [signIn, setSignIn] = useState<"access" | "password">("password");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api
      .team()
      .then((r) => (setTeam(r.team), setOwners(r.owners), setSignIn(r.signIn)))
      .catch((e: Error) => setError(e.message));
  }, []);
  const save = async (next: Team) => {
    setError(null);
    setSaved(false);
    try {
      setTeam((await api.putTeam(next)).team);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the team.");
    }
  };
  const valid = /^([^@\s*]+|\*)@[^@\s*]+\.[^@\s*]+$/.test(email.trim());
  return (
    <Modal title="Team" onClose={onClose}>
      <div className="ed-team">
        <p className="ed-hint">
          {signIn === "access"
            ? `People sign in through Cloudflare Access (with Google once it's added as a login method). Their role decides what they can do.${!owners.length && team && !Object.keys(team).length ? " Until you add someone here, everyone who can sign in is an owner; saving keeps you an owner." : ""}`
            : "The editor uses a password for now: whoever has it is the owner. Roles start working once Google sign-in is switched on."}
        </p>
        <ul className="ed-team-roles">
          {ROLES.map((r) => (
            <li key={r}>
              <strong>{ROLE_LABEL[r]}</strong> {ROLE_HINT[r]}
            </li>
          ))}
        </ul>
        {error ? <p className="ed-sheet-error">{error}</p> : null}
        {team === null && !error ? <p className="ed-hint">Loading…</p> : null}
        {team ? (
          <ul className="ed-team-list" aria-label="Team">
            {owners.map((o) => (
              <li key={o}>
                <span>{o}</span>
                <em>Owner (set on the server)</em>
              </li>
            ))}
            {Object.entries(team).map(([e, r]) => (
              <li key={e}>
                <span>{e.startsWith("*@") ? `Everyone at ${e.slice(2)}` : e}</span>
                {owner ? (
                  <>
                    <select className="ed-input" aria-label={`Role for ${e}`} value={r} onChange={(ev) => void save({ ...team, [e]: ev.target.value as Role })}>
                      {ROLES.map((x) => (
                        <option key={x} value={x}>
                          {ROLE_LABEL[x]}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="ed-mini"
                      aria-label={`Remove ${e}`}
                      onClick={() => {
                        const next = { ...team };
                        delete next[e];
                        void save(next);
                      }}
                    >
                      ×
                    </button>
                  </>
                ) : (
                  <em>{ROLE_LABEL[r]}</em>
                )}
              </li>
            ))}
            {!owners.length && !Object.keys(team).length ? <li className="ed-empty">No one added yet.</li> : null}
          </ul>
        ) : null}
        {owner && team ? (
          <form
            className="ed-team-add"
            onSubmit={(e) => {
              e.preventDefault();
              if (!valid) return;
              void save({ ...team, [email.trim().toLowerCase()]: role });
              setEmail("");
            }}
          >
            <input className="ed-input" placeholder="name@aerobotics.com or *@aerobotics.com" aria-label="Email to add" value={email} onChange={(e) => setEmail(e.target.value)} />
            <select className="ed-input" aria-label="Their role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {ROLES.map((x) => (
                <option key={x} value={x}>
                  {ROLE_LABEL[x]}
                </option>
              ))}
            </select>
            <Button type="submit" variant="accent" disabled={!valid}>
              Add
            </Button>
          </form>
        ) : null}
        {saved ? <p className="ed-hint">Saved.</p> : null}
      </div>
    </Modal>
  );
}
