import React, { useState, useEffect } from 'react';
import { Lock, Unlock, ArrowRight } from 'lucide-react';
import { hasVault, setupVault, unlockVault } from '../services/securityService';

interface Props {
    onUnlock: (key: CryptoKey) => void;
}

const VaultScreen: React.FC<Props> = ({ onUnlock }) => {
    const [isSetup, setIsSetup] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setIsSetup(!hasVault());
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let key;
            if (isSetup) {
                if(password.length < 4) throw new Error("كلمة المرور قصيرة جداً");
                key = await setupVault(password);
            } else {
                key = await unlockVault(password);
            }
            onUnlock(key); // نبعت المفتاح للتطبيق عشان يفتح
        } catch (err: any) {
            setError(err.message || "حدث خطأ");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 text-right" dir="rtl">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-2xl w-full max-w-md border border-slate-700">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-600 p-4 rounded-full shadow-lg shadow-indigo-500/30">
                        {isSetup ? <Unlock size={32} className="text-white"/> : <Lock size={32} className="text-white"/>}
                    </div>
                </div>
                
                <h2 className="text-2xl font-black text-center text-white mb-2">
                    {isSetup ? "إنشاء الخزنة الآمنة" : "فتح الخزنة"}
                </h2>
                <p className="text-slate-400 text-center text-sm mb-6">
                    {isSetup 
                        ? "أنشئ كلمة مرور رئيسية لتشفير جميع بيانات قنواتك. لا تنسها أبداً!" 
                        : "أدخل كلمة المرور لفك تشفير بيانات القنوات والبدء."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input 
                            type="password" 
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full p-4 bg-slate-900 border border-slate-600 rounded-xl text-white focus:ring-2 focus:ring-indigo-500 outline-none text-center font-bold tracking-widest text-lg"
                            placeholder="كلمة المرور الرئيسية"
                            autoFocus
                        />
                    </div>
                    
                    {error && <div className="text-red-400 text-sm text-center font-bold bg-red-900/20 p-2 rounded">{error}</div>}

                    <button 
                        disabled={loading || !password}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? "جاري المعالجة..." : (isSetup ? "إنشاء وبدء" : "فتح الخزنة")}
                        {!loading && <ArrowRight size={20}/>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VaultScreen;