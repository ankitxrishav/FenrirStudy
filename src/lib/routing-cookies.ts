import { StartPagePreference } from "@/lib/definitions";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function writeCookie(name: string, value: string | null) {
  if (typeof document === "undefined") return;
  if (!value) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  } else {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
  }
}

export function setAuthHintCookie(authed: boolean) {
  writeCookie("fenrir_authed", authed ? "1" : null);
}

export function setActiveRoomCookie(roomId: string | null) {
  writeCookie("fenrir_active_room", roomId);
}

export function setStartPageCookie(pref: StartPagePreference | null) {
  writeCookie("fenrir_start", pref);
}
