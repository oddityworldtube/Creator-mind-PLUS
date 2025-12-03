import React from 'react';
import { HistoryIcon } from './Icons';
import { IdeaSession as HistoryItem } from '../../types';

interface SessionManagerProps {
  sessions: HistoryItem[];
  onLoadSession: (sessionId: string) => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({ sessions, onLoadSession }) => {
  if (sessions.length === 0) {
    return null;
  }

  return (
    <div className="my-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <HistoryIcon className="h-5 w-5 text-indigo-500" />
          الجلسات السابقة
        </h2>
      </div>
      <div className="p-3 bg-white border border-gray-200 rounded-xl shadow-sm">
        <select 
            onChange={(e) => e.target.value && onLoadSession(e.target.value)}
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none text-right text-gray-700 font-medium text-sm outline-none"
            style={{ backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2364748b\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundPosition: 'left 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1em' }}
            defaultValue=""
        >
            <option value="" disabled>اختر جلسة سابقة لتحميلها...</option>
            {sessions.map(session => (
                <option key={session.id} value={session.id}>
                    {new Date(Number(session.id)).toLocaleString()} - {Array.isArray(session.niches) ? session.niches.join(', ') : session.niches}
                </option>
            ))}
        </select>
      </div>
    </div>
  );
};