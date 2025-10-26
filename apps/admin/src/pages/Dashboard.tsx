// src/pages/Dashboard.tsx
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

// Types
interface AnalyticsData {
    cards: {
        totalCustomers: number;
        successTransactions: number;
        totalOriginalAmount: number;
        totalDiscountAmount: number;
        totalTopupAmount: number;
        currentBalance: number;
        totalPackages: number;
        totalPromoCodes: number;
        totalPromoCodeUsage: number;
        totalPromoUsedAmount: number;
        usedPromoCodes: number;
        availablePromoCodes: number;
        successTopups: number;
    };
    charts: {
        dailyTransactions: Array<{ date: string; count: number; amount: number }>;
        operatorTopups: Array<{ operator: string; count: number; amount: number }>;
        promoCodeTypes: Array<{ type: string; count: number }>;
    };
    meta: {
        period: string;
        startDate: string;
        endDate: string;
        generatedAt: string;
    };
}

// Color constants for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
const OPERATOR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

export default function Dashboard() {
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');

    const { data: analyticsData, isLoading, error } = useQuery<{ data: AnalyticsData }>({
        queryKey: ["analytics", period],
        queryFn: async () => {
            const response = await api.get(`/api/admin/analytics?period=${period}`);
            return response.data;
        },
        refetchInterval: 300000, 
    });

    const analytics = analyticsData?.data;

    // Card definitions
    const cards = [
        {
            label: "Total Customers",
            value: analytics?.cards.totalCustomers ?? "—",
            icon: "👥",
            color: "text-blue-600",
            bgColor: "bg-blue-50"
        },
        {
            label: "Success Transactions",
            value: analytics?.cards.successTransactions ?? "—",
            icon: "✅",
            color: "text-green-600",
            bgColor: "bg-green-50"
        },
        {
            label: "Original Amount",
            value: analytics?.cards.totalOriginalAmount ? `$${analytics.cards.totalOriginalAmount.toFixed(2)}` : "—",
            icon: "💰",
            color: "text-purple-600",
            bgColor: "bg-purple-50"
        },
        {
            label: "Discount Amount",
            value: analytics?.cards.totalDiscountAmount ? `$${analytics.cards.totalDiscountAmount.toFixed(2)}` : "—",
            icon: "🎯",
            color: "text-orange-600",
            bgColor: "bg-orange-50"
        },
        {
            label: "Topup Amount",
            value: analytics?.cards.totalTopupAmount ? `$${analytics.cards.totalTopupAmount.toFixed(2)}` : "—",
            icon: "⬆️",
            color: "text-teal-600",
            bgColor: "bg-teal-50"
        },
        {
            label: "Current Balance",
            value: analytics?.cards.currentBalance ? `$${analytics.cards.currentBalance.toFixed(2)}` : "—",
            icon: "🏦",
            color: "text-indigo-600",
            bgColor: "bg-indigo-50"
        },
        {
            label: "Total Packages",
            value: analytics?.cards.totalPackages ?? "—",
            icon: "📦",
            color: "text-pink-600",
            bgColor: "bg-pink-50"
        },
        {
            label: "Total Promo Codes",
            value: analytics?.cards.totalPromoCodes ?? "—",
            icon: "🎫",
            color: "text-red-600",
            bgColor: "bg-red-50"
        },
        {
            label: "Promo Code Usage",
            value: analytics?.cards.totalPromoCodeUsage ?? "—",
            icon: "📊",
            color: "text-cyan-600",
            bgColor: "bg-cyan-50"
        },
        {
            label: "Promo Used Amount",
            value: analytics?.cards.totalPromoUsedAmount ? `$${analytics.cards.totalPromoUsedAmount.toFixed(2)}` : "—",
            icon: "💸",
            color: "text-lime-600",
            bgColor: "bg-lime-50"
        },
        {
            label: "Used Promo Codes",
            value: analytics?.cards.usedPromoCodes ?? "—",
            sub: analytics?.cards.availablePromoCodes ? `${analytics.cards.availablePromoCodes} available` : "",
            icon: "✅",
            color: "text-emerald-600",
            bgColor: "bg-emerald-50"
        },
        {
            label: "Success Topups",
            value: analytics?.cards.successTopups ?? "—",
            icon: "⚡",
            color: "text-amber-600",
            bgColor: "bg-amber-50"
        }
    ];

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="text-4xl mb-4">📊</div>
                    <h2 className="text-xl font-bold text-red-600">Error Loading Analytics</h2>
                    <p className="text-muted-foreground mt-2">
                        {error.message || "Failed to load analytics data. Please try again."}
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Period Filter */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
                    <p className="text-muted-foreground">
                        Comprehensive overview of your business performance
                    </p>
                </div>
                
                <div className="flex gap-2">
                    {(['today', 'week', 'month'] as const).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-4 py-2 rounded-lg border transition-all",
                                period === p
                                    ? "bg-blue-500 text-white border-blue-500"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                            )}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Analytics Cards Grid */}
            <section className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {cards.map((card, index) => (
                    <StatCard
                        key={card.label}
                        title={card.label}
                        value={card.value}
                        sub={card.sub}
                        loading={isLoading}
                        icon={card.icon}
                        color={card.color}
                        bgColor={card.bgColor}
                        delay={index * 100}
                    />
                ))}
            </section>

            {/* Charts Section */}
            {analytics && (
                <div className="space-y-6">
                    {/* Transaction Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Transactions Chart */}
                        <ChartCard title="Daily Transactions (Last 7 Days)">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.charts.dailyTransactions}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip 
                                        formatter={(value, name) => {
                                            if (name === 'amount') return [`$${Number(value).toFixed(2)}`, 'Amount'];
                                            return [value, 'Count'];
                                        }}
                                    />
                                    <Legend />
                                    <Bar dataKey="count" name="Transaction Count" fill="#0088FE" />
                                    <Bar dataKey="amount" name="Transaction Amount" fill="#00C49F" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Transaction Amount Trend */}
                        <ChartCard title="Transaction Amount Trend">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={analytics.charts.dailyTransactions}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
                                    <Legend />
                                    <Line 
                                        type="monotone" 
                                        dataKey="amount" 
                                        name="Amount" 
                                        stroke="#8884d8" 
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Operator and Promo Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Operator Topups */}
                        <ChartCard title="Topups by Operator">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={analytics.charts.operatorTopups}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="operator" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" name="Topup Count" fill="#FF6B6B" />
                                    <Bar dataKey="amount" name="Topup Amount" fill="#4ECDC4" />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* Promo Code Types */}
                        <ChartCard title="Promo Code Types Distribution">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={analytics.charts.promoCodeTypes}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ type, count }) => `${type}: ${count}`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                    >
                                        {analytics.charts.promoCodeTypes.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Success Rate Card */}
                        <MetricCard
                            title="Success Rate"
                            value={analytics.cards.successTransactions > 0 ? 
                                `${((analytics.cards.successTransactions / (analytics.cards.successTransactions + analytics.cards.successTopups)) * 100).toFixed(1)}%` : "0%"
                            }
                            description="Transaction success rate"
                            trend="up"
                            trendValue="12%"
                            icon="📈"
                        />

                        {/* Average Transaction Value */}
                        <MetricCard
                            title="Avg Transaction Value"
                            value={analytics.cards.successTransactions > 0 ? 
                                `$${(analytics.cards.totalOriginalAmount / analytics.cards.successTransactions).toFixed(2)}` : "$0.00"
                            }
                            description="Average value per successful transaction"
                            trend="stable"
                            icon="💳"
                        />

                        {/* Promo Code Effectiveness */}
                        <MetricCard
                            title="Promo Effectiveness"
                            value={analytics.cards.totalPromoCodeUsage > 0 ? 
                                `${((analytics.cards.totalPromoUsedAmount / analytics.cards.totalOriginalAmount) * 100).toFixed(1)}%` : "0%"
                            }
                            description="Discount amount vs total revenue"
                            trend="up"
                            trendValue="8%"
                            icon="🎯"
                        />
                    </div>
                </div>
            )}

            {/* Loading State */}
            {isLoading && (
                <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                        <p className="mt-4 text-muted-foreground">Loading analytics data...</p>
                    </div>
                </div>
            )}
        </div>
    );
}

// Component: Stat Card with Animation
function StatCard({
    title,
    value,
    sub,
    loading,
    icon,
    color,
    bgColor,
    delay = 0
}: {
    title: string;
    value: React.ReactNode;
    sub?: string;
    loading?: boolean;
    icon?: string;
    color?: string;
    bgColor?: string;
    delay?: number;
}) {
    return (
        <div 
            className={cn(
                "rounded-2xl border p-6 transition-all duration-300 hover:shadow-md",
                loading && "opacity-70",
                bgColor
            )}
            style={{ animationDelay: `${delay}ms` }}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-muted-foreground">{title}</div>
                {icon && <span className="text-2xl">{icon}</span>}
            </div>
            <div className={cn("text-2xl font-semibold tabular-nums", color)}>
                {loading ? (
                    <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
                ) : (
                    value
                )}
            </div>
            {sub && (
                <div className="text-xs text-muted-foreground mt-2">
                    {loading ? (
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
                    ) : (
                        sub
                    )}
                </div>
            )}
        </div>
    );
}

// Component: Chart Card Wrapper
function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border p-6 bg-white">
            <h3 className="text-lg font-semibold mb-4">{title}</h3>
            {children}
        </div>
    );
}

// Component: Metric Card for Additional Metrics
function MetricCard({
    title,
    value,
    description,
    trend,
    trendValue,
    icon
}: {
    title: string;
    value: string;
    description: string;
    trend?: 'up' | 'down' | 'stable';
    trendValue?: string;
    icon?: string;
}) {
    const trendColors = {
        up: 'text-green-600 bg-green-50',
        down: 'text-red-600 bg-red-50',
        stable: 'text-yellow-600 bg-yellow-50'
    };

    const trendIcons = {
        up: '↗️',
        down: '↘️',
        stable: '→'
    };

    return (
        <div className="rounded-2xl border p-6 bg-white">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-700">{title}</h3>
                {icon && <span className="text-xl">{icon}</span>}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-2">{value}</div>
            <p className="text-sm text-gray-600 mb-3">{description}</p>
            {trend && trendValue && (
                <div className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                    trendColors[trend]
                )}>
                    <span className="mr-1">{trendIcons[trend]}</span>
                    {trendValue} {trend === 'up' ? 'increase' : trend === 'down' ? 'decrease' : 'no change'}
                </div>
            )}
        </div>
    );
}

// Component: Section Title (existing)
function SectionTitle({ children }: { children: React.ReactNode }) {
    return <div className="mb-2 text-sm text-muted-foreground">{children}</div>;
}