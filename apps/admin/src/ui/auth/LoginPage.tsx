// src/ui/auth/LoginPage.tsx
import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();
    const loc = useLocation();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/auth/login", { email, password });
            toast.success("Welcome back");
            const from = (loc.state as any)?.from?.pathname || "/";
            nav(from, { replace: true });
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center">
            <div className="w-full px-6 lg:px-16 xl:px-20">
                {/* Wide, left-anchored card — ~60% of screen on lg+ */}
                <div className="w-full lg:w-[40vw] xl:w-[30vw] 2xl:w-[35vw]">
                    <Card className="rounded-2xl border shadow-sm">
                        <div className="p-6 md:p-10">
                            <h1 className="text-lg font-semibold tracking-tight">Sign in</h1>
                            <p className="mt-1 text-sm text-neutral-600">
                                Access your admin dashboard.
                            </p>

                            <form onSubmit={onSubmit} className="mt-6 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="you@company.com"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="text-sm text-neutral-600">
                                        <Link to="#" className="underline">Forgot password?</Link>
                                    </div>
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Signing in…" : "Sign in"}
                                    </Button>
                                </div>
                            </form>

                            <div className="mt-6 text-sm text-neutral-600">
                                Don’t have an account?{" "}
                                <Link to="/signup" className="underline">Create one</Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
