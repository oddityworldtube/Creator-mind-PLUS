import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { VideoData } from '../../types';

interface PerformanceChartProps {
    videos: VideoData[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ videos }) => {
    const chartData = videos.slice(0, 10).map(v => ({
        name: v.title.substring(0, 15) + '...',
        views: Number(v.viewCount),
        fullTitle: v.title
    })).reverse();

    return (
        <div className="h-80 w-full min-h-[300px]" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis 
                        tickFormatter={(value) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(value)} 
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo' }}
                        formatter={(value: number) => [new Intl.NumberFormat('en-US').format(value), 'مشاهدة']}
                    />
                    <Bar dataKey="views" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default PerformanceChart;