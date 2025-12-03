
import React, { useState, useEffect, useRef } from 'react';
import { ChannelProfile, AppSettings } from '../types';
import { Plus, Trash2, Save, Download, Upload, ShieldCheck, ShieldAlert, Key, Youtube, FileJson, AlertCircle, Lock, Cpu, X, CloudDownload, FileSpreadsheet, Info, Database, FileText, ExternalLink, HelpCircle, Edit, Check } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAppContext } from '../contexts/AppContext';

const Settings: React.FC = () => {
  const { profiles, currentProfileId, settings, addProfile, updateProfile, removeProfile, importProfiles, selectProfile, updateSettings } = useAppContext();
  const { addToast } = useToast();
  
  // --- Form State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newChannelId, setNewChannelId] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [newGeminiKey, setNewGeminiKey] = useState('');
  
  // Specific inputs for Secret and Token files (Manual Entry)
  const [secretFileContent, setSecretFileContent] = useState('');
  const [tokenFileContent, setTokenFileContent] = useState('');
  
  const [formError, setFormError] = useState('');
  const [showGuide, setShowGuide] = useState(false);
  
  // Model Management
  const [modelInput, setModelInput] = useState('');
  const [customModels, setCustomModels] = useState<string[]>([]);
  
  // Hidden File Inputs Refs
  const secretFileRef = useRef<HTMLInputElement>(null);
  const tokenFileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  // Toggle for Details Popover
  const [showDetailsId, setShowDetailsId] = useState<string | null>(null);

  useEffect(() => {
      // Merge defaults with saved custom models
      const defaults = ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'];
      const merged = Array.from(new Set([...defaults, ...(settings.customModels || [])]));
      setCustomModels(merged);
  }, [settings]);

  // --- Logic Helpers ---

  // Helper to extract Client ID & Secret from client_secret.json content
  const extractClientCredentials = (jsonStr: string): { clientId?: string, clientSecret?: string } => {
      try {
          const clean = jsonStr.trim();
          if (!clean) return {};
          const json = JSON.parse(clean);
          const data = json.installed || json.web;
          if (data && data.client_id && data.client_secret) {
              return { clientId: data.client_id, clientSecret: data.client_secret };
          }
          return {};
      } catch (e) { return {}; }
  };

  // Helper to extract Refresh Token from token.json content
  const extractTokens = (jsonStr: string): { refreshToken?: string, accessToken?: string } => {
      try {
          const clean = jsonStr.trim();
          if (!clean) return {};
          const json = JSON.parse(clean);
          if (json.refresh_token) {
              return { refreshToken: json.refresh_token, accessToken: json.access_token || json.token };
          }
          return {};
      } catch (e) { return {}; }
  };

  // Helper to escape CSV fields
  const escapeCSV = (field: string | undefined) => {
      if (!field) return '';
      const stringField = String(field);
      if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
          return `"${stringField.replace(/"/g, '""')}"`;
      }
      return stringField;
  };

  const parseCSV = (text: string) => {
    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (inQuotes) {
            if (char === '"' && nextChar === '"') {
                currentCell += '"';
                i++; // skip escaped quote
            } else if (char === '"') {
                inQuotes = false;
            } else {
                currentCell += char;
            }
        } else {
            if (char === '"') {
                inQuotes = true;
            } else if (char === ',') {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if (char === '\n' || char === '\r') {
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                }
                currentRow = [];
                currentCell = '';
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentCell += char;
            }
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
  };

  // --- Handlers ---

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>, setContent: (s: string) => void) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
          if (ev.target?.result) {
              setContent(ev.target.result as string);
              addToast("تم قراءة الملف بنجاح", "success");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleDownloadCsvTemplate = () => {
      const BOM = "\uFEFF";
      const header = "اسم القناة,معرف القناة (Channel ID),Youtube API Key,Gemini API Key,محتوى ملف السيكرت (Client Secret JSON),محتوى ملف التوكن (Token JSON)\n";
      const example = `قناتي التقنية,UCxxxx...,AIzaSy...,AIzaGe...,"{""installed"":{""client_id"":""...""}}","{""refresh_token"":""...""}"\n`;
      const example2 = `قناة الألعاب,UCyyyy...,AIzaSy...,AIzaGe...,"{""installed"":{""client_id"":""...""}}","{""refresh_token"":""...""}"\n`;
      
      const blob = new Blob([BOM + header + example + example2], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "channels_bulk_template.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("تم تحميل قالب CSV القياسي", "success");
  };

  const handleDownloadJsonTemplate = () => {
      const secretExample = JSON.stringify({
          installed: {
              client_id: "ENTER_CLIENT_ID_HERE",
              client_secret: "ENTER_CLIENT_SECRET_HERE"
          }
      }, null, 2);

      const tokenExample = JSON.stringify({
          refresh_token: "ENTER_REFRESH_TOKEN_HERE",
          access_token: "OPTIONAL_ACCESS_TOKEN"
      }, null, 2);

      const combinedContent = `
--- client_secret.json ---
${secretExample}

--- token.json ---
${tokenExample}
      `.trim();

      const blob = new Blob([combinedContent], { type: 'text/plain' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "json_templates.txt";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast("تم تحميل نماذج ملفات JSON", "success");
  };

  const handleExportCsv = () => {
      const BOM = "\uFEFF";
      const header = "اسم القناة,معرف القناة (Channel ID),Youtube API Key,Gemini API Key,محتوى ملف السيكرت (Client Secret JSON),محتوى ملف التوكن (Token JSON)\n";
      
      const rows = profiles.map(p => {
          // Reconstruct JSONs from stored credentials
          const secretObj = p.clientId ? { installed: { client_id: p.clientId, client_secret: p.clientSecret } } : {};
          const tokenObj = p.refreshToken ? { refresh_token: p.refreshToken, access_token: p.accessToken } : {};
          
          return [
              escapeCSV(p.name),
              escapeCSV(p.channelId),
              escapeCSV(p.apiKey),
              escapeCSV(p.geminiApiKey),
              escapeCSV(JSON.stringify(secretObj)),
              escapeCSV(JSON.stringify(tokenObj))
          ].join(',');
      }).join('\n');

      const blob = new Blob([BOM + header + rows], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `my_channels_backup_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast("تم تصدير جدول القنوات بنجاح", "success");
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          try {
            const rows = parseCSV(text);
            const batchProfiles: ChannelProfile[] = [];
            
            for (let index = 0; index < rows.length; index++) {
                const row = rows[index];
                // Skip header based on content
                if (index === 0 && (row[0].includes("اسم القناة") || row[0].toLowerCase().includes("name"))) continue;
                if (row.length < 3) continue; 

                const name = row[0];
                const chId = row[1]?.replace(/^@/, '').trim();
                const ytKey = row[2]?.trim();
                const geminiKey = row[3]?.trim() || '';
                const secretJson = row[4] || '';
                const tokenJson = row[5] || '';

                if (!name || !chId || !ytKey) continue;

                const creds = extractClientCredentials(secretJson);
                const tokens = extractTokens(tokenJson);

                // Check if profile exists to keep ID stable for updates
                const existing = profiles.find(p => p.channelId === chId);
                
                const profileData: ChannelProfile = {
                    id: existing ? existing.id : `${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
                    name: name,
                    channelId: chId,
                    apiKey: ytKey,
                    geminiApiKey: geminiKey,
                    clientId: creds.clientId || (existing?.clientId),
                    clientSecret: creds.clientSecret || (existing?.clientSecret),
                    refreshToken: tokens.refreshToken || (existing?.refreshToken),
                    accessToken: tokens.accessToken || (existing?.accessToken)
                };

                batchProfiles.push(profileData);
            }

            if (batchProfiles.length > 0) {
                await importProfiles(batchProfiles);
                addToast(`تمت معالجة ${batchProfiles.length} قناة بنجاح.`, "success");
            } else {
                addToast("لم يتم العثور على بيانات صالحة.", "warning");
            }
          } catch (err) {
              console.error(err);
              addToast("حدث خطأ أثناء قراءة ملف CSV.", "error");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  const handleSaveChannel = async () => {
    setFormError('');

    if (!newName || !newChannelId || !newApiKey) {
        setFormError("يرجى تعبئة الحقول الأساسية: اسم القناة، المعرف، ومفتاح Youtube.");
        return;
    }

    // Process Auth Files
    const creds = extractClientCredentials(secretFileContent);
    const tokens = extractTokens(tokenFileContent);

    const profileData: ChannelProfile = {
      id: editingId || Date.now().toString(),
      name: newName,
      channelId: newChannelId.replace(/^@/, '').trim(),
      apiKey: newApiKey.trim(),
      geminiApiKey: newGeminiKey.trim(),
      clientId: creds.clientId || (editingId ? profiles.find(p=>p.id===editingId)?.clientId : undefined),
      clientSecret: creds.clientSecret || (editingId ? profiles.find(p=>p.id===editingId)?.clientSecret : undefined),
      refreshToken: tokens.refreshToken || (editingId ? profiles.find(p=>p.id===editingId)?.refreshToken : undefined),
      accessToken: tokens.accessToken || (editingId ? profiles.find(p=>p.id===editingId)?.accessToken : undefined)
    };

    if (editingId) {
        await updateProfile(profileData);
        addToast("تم تحديث بيانات القناة", "success");
        setEditingId(null);
    } else {
        await addProfile(profileData);
        addToast("تم إضافة القناة بنجاح", "success");
    }
    
    // Clear Form
    clearForm();
  };

  const handleEdit = (profile: ChannelProfile) => {
      setEditingId(profile.id);
      setNewName(profile.name);
      setNewChannelId(profile.channelId);
      setNewApiKey(profile.apiKey);
      setNewGeminiKey(profile.geminiApiKey || '');
      
      // Reconstruct simplistic JSON for display/edit if they exist
      if (profile.clientId) {
          setSecretFileContent(JSON.stringify({ installed: { client_id: profile.clientId, client_secret: profile.clientSecret } }, null, 2));
      } else {
          setSecretFileContent('');
      }
      
      if (profile.refreshToken) {
          setTokenFileContent(JSON.stringify({ refresh_token: profile.refreshToken, access_token: profile.accessToken }, null, 2));
      } else {
          setTokenFileContent('');
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearForm = () => {
    setEditingId(null);
    setNewName('');
    setNewChannelId('');
    setNewApiKey('');
    setNewGeminiKey('');
    setSecretFileContent('');
    setTokenFileContent('');
    setFormError('');
  };

  const handleDeleteRow = async (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه القناة؟')) {
        await removeProfile(id);
        if (editingId === id) clearForm();
        addToast("تم حذف القناة", "info");
    }
  };

  // --- Model Management Handlers ---
  const handleAddModel = () => {
      if(modelInput && !customModels.includes(modelInput)) {
          const updated = [...customModels, modelInput];
          setCustomModels(updated);
          updateSettings({ customModels: updated });
          setModelInput('');
          addToast("تم إضافة النموذج", "success");
      }
  };

  const handleDeleteModel = (model: string) => {
      const updated = customModels.filter(m => m !== model);
      setCustomModels(updated);
      updateSettings({ customModels: updated });
  };

  const isProfileComplete = (p: ChannelProfile) => !!(p.refreshToken && p.clientId && p.clientSecret);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
          <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  <Database className="text-indigo-600" />
                  إدارة القنوات والنماذج
              </h2>
              <div className="flex items-center gap-2 mt-1">
                  <p className="text-gray-500 dark:text-gray-400 text-sm">تحكم في القنوات المتصلة وإعدادات الذكاء الاصطناعي.</p>
                  <button onClick={() => setShowGuide(!showGuide)} className="text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:underline flex items-center gap-1">
                      <HelpCircle size={12} /> كيف أحصل على البيانات؟
                  </button>
              </div>
          </div>
          <div className="flex gap-2">
              <input type="file" ref={csvFileRef} className="hidden" accept=".csv" onChange={handleCsvImport} />
              <button onClick={() => csvFileRef.current?.click()} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md flex items-center gap-2 text-sm">
                  <FileSpreadsheet size={16}/> استيراد CSV (جماعي)
              </button>
              <button onClick={handleExportCsv} className="bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-50 dark:hover:bg-slate-700 shadow-sm flex items-center gap-2 text-sm">
                  <FileText size={16}/> تصدير الجدول
              </button>
          </div>
      </div>

      {/* API Guide Section */}
      {showGuide && (
          <div className="bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 rounded-xl p-6 animate-fade-in-down">
              <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
                  <Info size={18}/> دليل الحصول على الروابط والبيانات
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
                      <h4 className="font-bold text-red-600 mb-2 flex items-center gap-2"><Youtube size={16}/> 1. YouTube Data API</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs leading-relaxed">
                          تحتاج لإنشاء مشروع في Google Cloud وتفعيل YouTube Data API v3 للحصول على API Key.
                      </p>
                      <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" className="text-xs bg-red-50 text-red-700 px-3 py-1.5 rounded border border-red-100 hover:bg-red-100 flex items-center justify-between">
                          تفعيل الخدمة <ExternalLink size={12}/>
                      </a>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
                      <h4 className="font-bold text-indigo-600 mb-2 flex items-center gap-2"><Cpu size={16}/> 2. Gemini API Key</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs leading-relaxed">
                          احصل على مفتاح الذكاء الاصطناعي (Gemini) مجاناً من Google AI Studio لتحليل الفيديوهات.
                      </p>
                      <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded border border-indigo-100 hover:bg-indigo-100 flex items-center justify-between">
                          إنشاء مفتاح <ExternalLink size={12}/>
                      </a>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-lg shadow-sm">
                      <h4 className="font-bold text-amber-600 mb-2 flex items-center gap-2"><Key size={16}/> 3. OAuth Credentials</h4>
                      <p className="text-gray-600 dark:text-gray-400 mb-3 text-xs leading-relaxed">
                          للتعديل والنشر، تحتاج إنشاء OAuth Client ID وتحميل ملف client_secret.json.
                      </p>
                      <a href="https://console.cloud.google.com/apis/credentials" target="_blank" className="text-xs bg-amber-50 text-amber-700 px-3 py-1.5 rounded border border-amber-100 hover:bg-amber-100 flex items-center justify-between">
                          إعداد OAuth <ExternalLink size={12}/>
                      </a>
                  </div>
              </div>
          </div>
      )}

      {/* Edit/Add Form */}
      <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-md border overflow-hidden transition-colors duration-300 ${editingId ? 'border-indigo-500 ring-2 ring-indigo-100 dark:ring-indigo-900' : 'border-indigo-100 dark:border-slate-800'}`}>
          <div className={`p-4 border-b flex items-center justify-between flex-wrap gap-2 ${editingId ? 'bg-indigo-600 text-white' : 'bg-indigo-50/80 dark:bg-indigo-900/20 border-indigo-100 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2">
                {editingId ? <Edit size={20} /> : <Plus className="text-indigo-600 dark:text-indigo-400" size={20} />}
                <h3 className={`font-bold ${editingId ? 'text-white' : 'text-indigo-900 dark:text-indigo-200'}`}>
                    {editingId ? 'تعديل بيانات القناة' : 'إضافة قناة جديدة'}
                </h3>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleDownloadCsvTemplate} className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-2 transition ${editingId ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : 'bg-transparent text-green-700 dark:text-green-400 border-green-200 dark:border-green-900 hover:bg-green-50'}`} title="تحميل قالب CSV">
                       <Download size={14}/> قالب CSV
                  </button>
                  <button onClick={handleDownloadJsonTemplate} className={`text-xs px-3 py-1.5 rounded-lg border font-bold flex items-center gap-2 transition ${editingId ? 'bg-white/20 text-white border-white/30 hover:bg-white/30' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900 hover:bg-indigo-50'}`}>
                      <CloudDownload size={14}/> قوالب JSON
                  </button>
              </div>
          </div>
          
          <div className="p-6 space-y-6">
              {/* Row 1: Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">اسم القناة</label>
                      <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full border rounded p-2.5 text-sm outline-none focus:border-indigo-500 transition bg-gray-50 focus:bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:bg-slate-700" placeholder="مثال: قناتي الرئيسية" />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">معرف القناة (ID)</label>
                      <input value={newChannelId} onChange={e => setNewChannelId(e.target.value)} className="w-full border rounded p-2.5 text-sm outline-none focus:border-indigo-500 transition bg-gray-50 focus:bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:bg-slate-700 font-mono" placeholder="UCxxxxxxxx..." />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Youtube size={12}/> Youtube API Key</label>
                      <input value={newApiKey} onChange={e => setNewApiKey(e.target.value)} type="password" className="w-full border rounded p-2.5 text-sm outline-none focus:border-indigo-500 transition bg-gray-50 focus:bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:bg-slate-700 font-mono" placeholder="AIza..." />
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1"><Key size={12}/> Gemini API Key</label>
                      <input value={newGeminiKey} onChange={e => setNewGeminiKey(e.target.value)} type="password" className="w-full border rounded p-2.5 text-sm outline-none focus:border-indigo-500 transition bg-gray-50 focus:bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:focus:bg-slate-700 font-mono" placeholder="AIza..." />
                  </div>
              </div>

              {/* Row 2: Auth Files Content */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-slate-800">
                  {/* Secret File */}
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <FileJson size={14} className="text-amber-600"/> 
                            محتوى ملف client_secret.json
                        </label>
                        <button onClick={() => secretFileRef.current?.click()} className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 px-2 py-1 rounded hover:bg-amber-100 font-bold border border-amber-200 dark:border-amber-800 flex items-center gap-1 transition">
                            <Upload size={10}/> رفع ملف
                        </button>
                        <input type="file" ref={secretFileRef} className="hidden" accept=".json" onChange={(e) => handleFileRead(e, setSecretFileContent)} />
                      </div>
                      <textarea 
                          value={secretFileContent}
                          onChange={e => setSecretFileContent(e.target.value)}
                          className="w-full border rounded p-3 text-xs font-mono bg-amber-50/30 focus:bg-white focus:ring-2 focus:ring-amber-200 dark:bg-slate-800 dark:border-slate-700 dark:text-amber-100 dark:focus:bg-slate-700 outline-none h-24 placeholder:text-gray-400"
                          placeholder='لصق محتوى الملف هنا أو استخدم زر الرفع...'
                      ></textarea>
                  </div>

                  {/* Token File */}
                  <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <FileText size={14} className="text-green-600"/> 
                            محتوى ملف token.json
                        </label>
                         <button onClick={() => tokenFileRef.current?.click()} className="text-[10px] bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded hover:bg-green-100 font-bold border border-green-200 dark:border-green-800 flex items-center gap-1 transition">
                            <Upload size={10}/> رفع ملف
                        </button>
                        <input type="file" ref={tokenFileRef} className="hidden" accept=".json" onChange={(e) => handleFileRead(e, setTokenFileContent)} />
                      </div>
                      <textarea 
                          value={tokenFileContent}
                          onChange={e => setTokenFileContent(e.target.value)}
                          className="w-full border rounded p-3 text-xs font-mono bg-green-50/30 focus:bg-white focus:ring-2 focus:ring-green-200 dark:bg-slate-800 dark:border-slate-700 dark:text-green-100 dark:focus:bg-slate-700 outline-none h-24 placeholder:text-gray-400"
                          placeholder='لصق محتوى الملف هنا أو استخدم زر الرفع...'
                      ></textarea>
                  </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                  <div className="text-sm min-h-[24px]">
                      {formError && <span className="text-red-600 font-bold flex items-center gap-1 animate-pulse"><AlertCircle size={16}/> {formError}</span>}
                  </div>
                  <div className="flex gap-2">
                      {editingId && (
                          <button onClick={clearForm} className="bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg font-bold hover:bg-gray-300 transition flex items-center gap-2">
                              إلغاء
                          </button>
                      )}
                      <button onClick={handleSaveChannel} className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-bold hover:bg-indigo-700 shadow-md transition flex items-center gap-2">
                          {editingId ? <Save size={18} /> : <Plus size={18} />}
                          {editingId ? 'حفظ التعديلات' : 'إضافة للقائمة'}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 overflow-visible transition-colors">
          <div className="overflow-visible">
            <table className="w-full text-right text-sm">
                <thead className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold border-b dark:border-slate-700">
                    <tr>
                        <th className="p-4 w-10 text-center">#</th>
                        <th className="p-4">اسم القناة</th>
                        <th className="p-4">Youtube Key</th>
                        <th className="p-4">Gemini Key</th>
                        <th className="p-4 text-center">الحالة والصلاحيات</th>
                        <th className="p-4 w-32 text-center">إجراءات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {profiles.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="p-10 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center gap-2">
                                <Database size={40} className="opacity-20"/>
                                <p>القائمة فارغة. أضف قناتك الأولى أعلاه لتبدأ.</p>
                            </td>
                        </tr>
                    ) : (
                        profiles.map(profile => {
                            const isComplete = isProfileComplete(profile);
                            const isEditing = editingId === profile.id;
                            
                            return (
                                <tr key={profile.id} className={`hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition group ${currentProfileId === profile.id ? 'bg-indigo-50 dark:bg-slate-800 border-l-4 border-l-indigo-600' : ''} ${isEditing ? 'bg-indigo-50/50' : ''}`}>
                                    <td className="p-4 text-center">
                                        <input 
                                            type="radio" 
                                            name="activeChannel" 
                                            checked={currentProfileId === profile.id}
                                            onChange={() => selectProfile(profile.id)}
                                            className="w-4 h-4 text-indigo-600 cursor-pointer"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                                            {profile.name}
                                            {isEditing && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1 rounded border border-indigo-200">جاري التعديل</span>}
                                        </div>
                                        <div className="text-xs text-gray-400 dark:text-gray-500 font-mono">{profile.channelId}</div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {profile.apiKey ? '••••••••' + profile.apiKey.slice(-4) : <span className="text-red-300">مفقود</span>}
                                    </td>
                                    <td className="p-4 font-mono text-xs text-gray-500 dark:text-gray-400">
                                        {profile.geminiApiKey ? '••••••••' + profile.geminiApiKey.slice(-4) : <span className="text-gray-300 dark:text-gray-600 italic">Global</span>}
                                    </td>
                                    <td className="p-4 text-center relative">
                                        <div className="flex items-center justify-center gap-2">
                                            {isComplete ? (
                                                <span className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-bold border border-green-200 dark:border-green-800 shadow-sm">
                                                    <ShieldCheck size={14}/> متصل
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400 px-3 py-1 rounded-full text-xs font-medium border border-gray-200 dark:border-slate-700">
                                                    <ShieldAlert size={14}/> محدود
                                                </span>
                                            )}
                                            <button 
                                                onClick={() => setShowDetailsId(showDetailsId === profile.id ? null : profile.id)} 
                                                className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                                title="تفاصيل الصلاحيات"
                                            >
                                                <Info size={16}/>
                                            </button>
                                        </div>
                                        
                                        {/* Permission Details Popover */}
                                        {showDetailsId === profile.id && (
                                            <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-72 bg-gray-800 text-white p-4 rounded-xl shadow-2xl z-50 text-right animate-fade-in-up border border-gray-700">
                                                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
                                                    <h4 className="font-bold text-sm flex items-center gap-2"><Lock size={14} className="text-yellow-400"/> تفاصيل الأمان</h4>
                                                    <button onClick={() => setShowDetailsId(null)} className="text-gray-500 hover:text-white"><ShieldAlert size={14}/></button>
                                                </div>
                                                <div className="space-y-3 text-xs text-gray-300">
                                                    <div>
                                                        <span className="block text-gray-500 mb-1">حالة التوكن (OAuth):</span>
                                                        <span className={isComplete ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                                                            {isComplete ? "✅ صالح (تجديد تلقائي)" : "❌ غير موجود"}
                                                        </span>
                                                    </div>
                                                    {isComplete && (
                                                        <div className="pt-2 border-t border-gray-700 text-[10px] text-gray-500">
                                                            يتم تجديد الرصيد يومياً الساعة 10 ص بتوقيت مكة.
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gray-800 rotate-45 border-l border-t border-gray-700"></div>
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button 
                                                onClick={(e) => { e.preventDefault(); handleEdit(profile); }}
                                                className="text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 p-2 rounded-lg transition"
                                                title="تعديل البيانات"
                                            >
                                                <Edit size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteRow(profile.id); }}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition"
                                                title="حذف القناة"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
          </div>
      </div>
      
      {/* Model Management Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
           <div className="bg-gray-50 dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2"><Cpu size={18} className="text-purple-600"/> إدارة نماذج الذكاء الاصطناعي (Models)</h3>
           </div>
           <div className="p-6">
               <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">تم إضافة النماذج الافتراضية المطلوبة تلقائياً. يمكنك إضافة نماذج مخصصة إضافية.</p>
               <div className="flex gap-2 max-w-lg mb-4">
                   <input 
                        value={modelInput}
                        onChange={e => setModelInput(e.target.value)}
                        placeholder="اسم النموذج (Model Name)" 
                        className="flex-1 border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none font-mono bg-white dark:bg-slate-800 dark:text-white dark:border-slate-700"
                   />
                   <button onClick={handleAddModel} className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-bold hover:bg-purple-700 shadow-md">إضافة</button>
               </div>
               <div className="flex flex-wrap gap-2">
                   {customModels.map(m => {
                       const isDefault = ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'].includes(m);
                       return (
                           <span key={m} className={`border px-3 py-1 rounded-full text-sm font-mono flex items-center gap-2 ${isDefault ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300' : 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300'}`}>
                               {m}
                               {isDefault ? <Lock size={12} className="opacity-50"/> : <button onClick={() => handleDeleteModel(m)} className="text-purple-400 hover:text-red-500"><X size={14}/></button>}
                           </span>
                       )
                   })}
               </div>
           </div>
      </div>

    </div>
  );
};

export default Settings;
