// Maps the app's screen keys to URL paths and back. Keeps navDef / titles
// (keyed by screen) working alongside react-router.
export const SCREENS = [
  { key: "dashboard", path: "/" },
  { key: "upload",    path: "/upload" },
  { key: "result",    path: "/result" },
  { key: "cases",     path: "/cases" },
  { key: "context",   path: "/context" },
  { key: "handoff",   path: "/handoff" },
  { key: "analytics", path: "/analytics" },
  { key: "users",     path: "/users" },
];

export const pathFor = (key) => (SCREENS.find((s) => s.key === key) || SCREENS[0]).path;

export function screenFromPath(pathname) {
  if (pathname.startsWith("/result")) return "result";
  const m = SCREENS.find((s) => s.path !== "/" && pathname.startsWith(s.path));
  return m ? m.key : "dashboard";
}
