export type MeUser = {
  id: string;
  email: string;
  role: string; // "admin" | "customer" | ...
  permissions?: string[];
};

export function getToken() {
  return localStorage.getItem("admin:token");
}
export function setToken(t: string) {
  localStorage.setItem("admin:token", t);
}
export function clearToken() {
  localStorage.removeItem("admin:token");
}
