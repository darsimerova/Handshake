const SESSION_KEY = "handshake_guest_id";
const GUEST_NAME_KEY = "handshake_guest_name";

export function getSessionId(): string {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

/** Returns null if the prompt has never been shown; "" if the user skipped. */
export function getGuestName(): string | null {
  return localStorage.getItem(GUEST_NAME_KEY);
}

/** Call with the entered name, or "" to indicate the user skipped. */
export function setGuestName(name: string): void {
  localStorage.setItem(GUEST_NAME_KEY, name);
}
