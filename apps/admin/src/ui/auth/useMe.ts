import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type MeUser = {
  id: string;
  email: string;
  role: "admin" | "customer" | string;
  permissions?: string[];
};

export function useMe() {
  return useQuery<MeUser>({
    queryKey: ["me"],
    queryFn: async () => (await api.get("/auth/me")).data,
    staleTime: 60_000,
    retry: false,
  });
}
