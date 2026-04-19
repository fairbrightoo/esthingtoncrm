import { TrendingUp, Users, DollarSign, ShoppingBag } from 'lucide-react';

interface DashboardStatsProps {
    stats: {
        totalRevenue: number;
        salesCount: number;
        totalSalesValue: number;
        conversionRate: number; // string that parses to float
    } | null;
    branding?: any;
}

export const DashboardStats = ({ stats, branding }: DashboardStatsProps) => {
    if (!stats) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl"></div>;

    const cards = [
        {
            label: 'Total Revenue',
            value: `₦${stats.totalRevenue.toLocaleString()}`,
            subtext: 'Collected to date',
            icon: DollarSign,
            color: 'bg-green-500',
            textColor: 'text-green-600'
        },
        {
            label: 'Active Sales',
            value: stats.salesCount,
            subtext: `Target: ₦${stats.totalSalesValue.toLocaleString()}`, // Showing total agreed value
            icon: ShoppingBag,
            color: 'bg-blue-500',
            textColor: 'text-blue-600'
        },
        {
            label: 'Conversion Rate',
            value: `${stats.conversionRate}%`,
            subtext: 'Leads -> Clients',
            icon: TrendingUp,
            color: 'bg-purple-500',
            textColor: 'text-purple-600'
        },
        // Placeholder for future use or distinct metric
        // {
        //     label: 'Pending Balance',
        //     value: `₦${(stats.totalSalesValue - stats.totalRevenue).toLocaleString()}`,
        //     subtext: 'To be collected',
        //     icon: Users,
        //     color: 'bg-orange-500',
        //     textColor: 'text-orange-600'
        // }
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {cards.map((card, idx) => (
                <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium mb-1">{card.label}</p>
                        <h3 className="text-2xl font-bold text-gray-800">{card.value}</h3>
                        <p className={`text-xs mt-2 ${card.textColor} font-medium`}>{card.subtext}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${card.color} bg-opacity-10 text-${card.color.split('-')[1]}-600`}>
                        <card.icon size={24} />
                    </div>
                </div>
            ))}
        </div>
    );
};
