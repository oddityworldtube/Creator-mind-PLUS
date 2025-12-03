import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
    color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition">
      <div className="absolute top-0 right-0 w-1 h-full" style={{ backgroundColor: color }}></div>
      <div className="flex justify-between items-start z-10 relative">
        <div>
          <p className="text-gray-500 text-sm font-bold mb-2">{title}</p>
          <h3 className="text-2xl font-black text-gray-800 font-mono tracking-tight">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl bg-opacity-10 transition-transform group-hover:scale-110`} style={{ backgroundColor: color + '20', color: color }}>
          {icon}
        </div>
      </div>
    </div>
);

export default StatCard;