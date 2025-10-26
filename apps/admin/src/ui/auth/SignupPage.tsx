// src/ui/auth/SignupPage.tsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const nav = useNavigate();

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/auth/signup", { email, password, phone });
            toast.success("Account created. Please sign in.");
            nav("/login", { replace: true });
        } catch (err: any) {
            toast.error(err?.response?.data?.error || "Signup failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex items-center">
            <div className="w-full px-6 lg:px-16 xl:px-20">
                <div className="w-full lg:w-[40vw] xl:w-[30vw] 2xl:w-[35vw]">
                    <Card className="rounded-2xl border shadow-sm">
                        <div className="p-6 md:p-10">
                            <h1 className="text-lg font-semibold tracking-tight">Create account</h1>
                            <p className="mt-1 text-sm text-neutral-600">Sign up to get started.</p>

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
                                    <Label htmlFor="phone">Phone (optional)</Label>
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="07xxxxxxxx"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        autoComplete="new-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        placeholder="••••••••"
                                    />
                                </div>

                                <div className="flex items-center justify-end">
                                    <Button type="submit" disabled={loading}>
                                        {loading ? "Creating…" : "Create account"}
                                    </Button>
                                </div>
                            </form>

                            <div className="mt-6 text-sm text-neutral-600">
                                Already have an account?{" "}
                                <Link to="/login" className="underline">Sign in</Link>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
