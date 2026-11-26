import { useSyncExternalStore } from "react";
import { can, type Action, type Role } from "../../model/roles";
import { api } from "../api";

/** Your role in this editor, from the server (owner until it says otherwise: the server enforces it anyway). */
let role: Role = "owner";
let who = "";
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export async function loadRole() {
  try {
    const me = await api.me();
    role = me.role;
    who = me.who;
    emit();
  } catch {
    /* older server or offline: keep the default */
  }
}
export const getRole = () => role;
export const getWho = () => who;
export const canDo = (a: Action) => can(role, a);
export function useRole(): Role {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => role,
    () => role,
  );
}
export const useCan = (a: Action) => can(useRole(), a);
