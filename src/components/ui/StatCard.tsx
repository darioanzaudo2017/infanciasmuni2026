// React import removed
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'primary' | 'success' | 'warning' | 'danger' | 'info';
    trend?: string;
    trendType?: 'up' | 'down' | 'neutral';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, trend, trendType }) => {
    const colorMap = {
        primary: 'bg-primary/10 text-primary',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        info: 'bg-info/10 text-info',
    };

    return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-md ${colorMap[color]} transition-transform group-hover:scale-110`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${trendType === 'up' ? 'bg-success/10 text-success' :
                        trendType === 'down' ? 'bg-danger/10 text-danger' :
                            'bg-slate-100 text-slate-500'
                        }`}>
                        {trend}
                    </span>
                )}
            </div>
            <div>
                <h3 className="text-sm font-medium text-slate-500 mb-1">{title}</h3>
                <p className="text-2xl font-bold text-slate-900">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;
