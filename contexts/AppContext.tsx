import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChannelProfile, AppSettings } from '../types';
import * as db from '../services/dbService';
import { encryptData, decryptData, isEncryptedString } from '../services/securityService';

interface AppContextType {
  profiles: ChannelProfile[];
  currentProfileId: string | null;
  settings: AppSettings;
  isLoading: boolean;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  addProfile: (profile: ChannelProfile) => Promise<void>;
  updateProfile: (profile: ChannelProfile) => Promise<void>;
  removeProfile: (id: string) => Promise<void>;
  importProfiles: (profiles: ChannelProfile[]) => Promise<void>;
  selectProfile: (id: string) => void;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};

export const AppProvider: React.FC<{ children: ReactNode; masterKey: CryptoKey }> = ({ children, masterKey }) => {
  const [profiles, setProfiles] = useState<ChannelProfile[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({ geminiApiKeys: [], customModels: [], theme: 'light' });
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');

  // Initialize Data ONLY when masterKey is available
  useEffect(() => {
    const init = async () => {
      if (!masterKey) return;
      
      try {
        // 1. Settings
        let loadedSettings: AppSettings | undefined = undefined;
        
        // Try local storage encrypted first (Priority for Vault)
        const lsSettings = localStorage.getItem('yt_analyzer_settings');
        if (lsSettings && isEncryptedString(lsSettings)) {
             loadedSettings = await decryptData<AppSettings>(lsSettings, masterKey) || undefined;
        }

        if (!loadedSettings) {
             // Fallback to DB if not in encrypted local storage (Migration path or if DB preferred)
             loadedSettings = await db.getSettings();
        }
        
        const mergedSettings: AppSettings = {
            geminiApiKeys: [],
            customModels: ['gemini-2.0-flash', 'gemini-2.5-pro', 'gemini-2.5-flash'],
            theme: 'light',
            ...loadedSettings
        };
        setSettings(mergedSettings);
        setThemeState(mergedSettings.theme);
        applyTheme(mergedSettings.theme);

        // 2. Profiles
        let loadedProfiles: ChannelProfile[] = [];
        const savedProfilesRaw = localStorage.getItem('yt_analyzer_profiles');
        
        if (savedProfilesRaw && isEncryptedString(savedProfilesRaw)) {
            loadedProfiles = await decryptData<ChannelProfile[]>(savedProfilesRaw, masterKey) || [];
        } else {
            // Fallback: Check DB if localStorage empty
            const dbProfiles = await db.getProfiles();
            if (dbProfiles && dbProfiles.length > 0) loadedProfiles = dbProfiles;
        }

        setProfiles(loadedProfiles);
        if (loadedProfiles.length > 0) setCurrentProfileId(loadedProfiles[0].id);

      } catch (e) {
        console.error("Initialization error", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, [masterKey]);

  const applyTheme = (t: 'light' | 'dark') => {
      const root = window.document.documentElement;
      if (t === 'dark') {
          root.classList.add('dark');
      } else {
          root.classList.remove('dark');
      }
  };

  const setTheme = (t: 'light' | 'dark') => {
      setThemeState(t);
      applyTheme(t);
      updateSettings({ theme: t });
  };

  const updateSettings = async (newPart: Partial<AppSettings>) => {
      const updated = { ...settings, ...newPart };
      setSettings(updated);
      await db.saveSettings(updated);
      // Encrypted Backup
      const encrypted = await encryptData(updated, masterKey);
      localStorage.setItem('yt_analyzer_settings', encrypted);
  };

  const addProfile = async (profile: ChannelProfile) => {
      const updated = [...profiles, profile];
      setProfiles(updated);
      // Save to DB
      await db.saveProfile(profile);
      // Encrypted Backup
      const encrypted = await encryptData(updated, masterKey);
      localStorage.setItem('yt_analyzer_profiles', encrypted);
      if (!currentProfileId) setCurrentProfileId(profile.id);
  };

  const updateProfile = async (profile: ChannelProfile) => {
      const updated = profiles.map(p => p.id === profile.id ? profile : p);
      setProfiles(updated);
      await db.saveProfile(profile);
      const encrypted = await encryptData(updated, masterKey);
      localStorage.setItem('yt_analyzer_profiles', encrypted);
  };

  const removeProfile = async (id: string) => {
      const updated = profiles.filter(p => p.id !== id);
      setProfiles(updated);
      await db.deleteProfile(id);
      const encrypted = await encryptData(updated, masterKey);
      localStorage.setItem('yt_analyzer_profiles', encrypted);
      if (currentProfileId === id) setCurrentProfileId(updated.length > 0 ? updated[0].id : null);
  };

  const importProfiles = async (newProfiles: ChannelProfile[]) => {
      // 1. Merge logic: Create a map from existing profiles to handle updates by ID
      const currentMap = new Map(profiles.map(p => [p.id, p]));
      
      // 2. Add or Overwrite
      for (const p of newProfiles) {
          currentMap.set(p.id, p);
          await db.saveProfile(p);
      }
      
      // 3. Update State
      const updatedList = Array.from(currentMap.values());
      setProfiles(updatedList);
      
      // 4. Encrypt & Backup
      const encrypted = await encryptData(updatedList, masterKey);
      localStorage.setItem('yt_analyzer_profiles', encrypted);
      
      // 5. Set default if none selected
      if (!currentProfileId && updatedList.length > 0) setCurrentProfileId(updatedList[0].id);
  };

  return (
    <AppContext.Provider value={{
      profiles, currentProfileId, settings, isLoading, theme,
      setTheme, addProfile, updateProfile, removeProfile, importProfiles, selectProfile: setCurrentProfileId, updateSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};