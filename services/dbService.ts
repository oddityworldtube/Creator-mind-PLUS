import { openDB, DBSchema } from 'idb';
import { ChannelProfile, AppSettings, SavedCompetitor, IdeaSession, CanvasTemplate } from '../types';

interface CreatorMindDB extends DBSchema {
  profiles: {
    key: string;
    value: ChannelProfile;
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  competitors: {
    key: string;
    value: SavedCompetitor;
  };
  ideaHistory: {
    key: string;
    value: IdeaSession;
  };
  templates: {
    key: string;
    value: CanvasTemplate;
  };
}

const DB_NAME = 'creatormind_db';
const DB_VERSION = 1;

export const initDB = async () => {
  return openDB<CreatorMindDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profiles')) {
        db.createObjectStore('profiles', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' }); // Fixed ID 'global'
      }
      if (!db.objectStoreNames.contains('competitors')) {
        db.createObjectStore('competitors', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('ideaHistory')) {
        db.createObjectStore('ideaHistory', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    },
  });
};

// --- Profiles ---
export const saveProfile = async (profile: ChannelProfile) => {
  const db = await initDB();
  await db.put('profiles', profile);
};

export const getProfiles = async (): Promise<ChannelProfile[]> => {
  const db = await initDB();
  return db.getAll('profiles');
};

export const deleteProfile = async (id: string) => {
  const db = await initDB();
  await db.delete('profiles', id);
};

// --- Settings ---
export const saveSettings = async (settings: AppSettings) => {
  const db = await initDB();
  await db.put('settings', { ...settings, id: 'global' } as any);
};

export const getSettings = async (): Promise<AppSettings | undefined> => {
  const db = await initDB();
  const res = await db.get('settings', 'global');
  return res ? { ...res } : undefined;
};

// --- Templates ---
export const saveTemplate = async (template: CanvasTemplate) => {
  const db = await initDB();
  await db.put('templates', template);
};

export const getTemplates = async (): Promise<CanvasTemplate[]> => {
  const db = await initDB();
  return db.getAll('templates');
};

export const deleteTemplate = async (id: string) => {
  const db = await initDB();
  await db.delete('templates', id);
};

// --- Competitors ---
export const saveCompetitor = async (competitor: SavedCompetitor) => {
    const db = await initDB();
    await db.put('competitors', competitor);
};

export const getCompetitors = async (): Promise<SavedCompetitor[]> => {
    const db = await initDB();
    return db.getAll('competitors');
};

export const deleteCompetitor = async (id: string) => {
    const db = await initDB();
    await db.delete('competitors', id);
};

// --- Idea History ---
export const saveIdeaSession = async (session: IdeaSession) => {
    const db = await initDB();
    await db.put('ideaHistory', session);
};

export const getIdeaHistory = async (): Promise<IdeaSession[]> => {
    const db = await initDB();
    const all = await db.getAll('ideaHistory');
    // Sort by date desc
    return all.sort((a, b) => Number(b.id) - Number(a.id));
};

export const deleteIdeaSession = async (id: string | number) => {
    const db = await initDB();
    await db.delete('ideaHistory', id.toString());
};

export const clearIdeaHistory = async () => {
    const db = await initDB();
    await db.clear('ideaHistory');
};