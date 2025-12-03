// services/securityService.ts

const SALT_STORAGE_KEY = 'vault_salt';
const VERIFIER_STORAGE_KEY = 'vault_verifier'; // عشان نتأكد ان الباسورد صح
const ALGORITHM_NAME = 'AES-GCM';
const ENC_PREFIX = 'enc_v1:';

// 1. هل الخزنة موجودة أصلاً؟ (هل المستخدم عمل باسورد قبل كدة؟)
export const hasVault = (): boolean => {
    return !!localStorage.getItem(SALT_STORAGE_KEY);
};

// 2. إنشاء خزنة جديدة (لأول مرة)
export const setupVault = async (password: string): Promise<CryptoKey> => {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const key = await deriveKey(password, salt);
    
    // نشفر كلمة "VALID" عشان نستخدمها بعد كدة للتأكد ان الباسورد صح
    const verifier = await encryptDataRaw("VALID", key);
    
    // نحفظ الملح (Salt) والتحقق (Verifier) في المتصفح
    localStorage.setItem(SALT_STORAGE_KEY, JSON.stringify(Array.from(salt)));
    localStorage.setItem(VERIFIER_STORAGE_KEY, JSON.stringify(verifier));
    
    return key;
};

// 3. فتح الخزنة (تسجيل الدخول)
export const unlockVault = async (password: string): Promise<CryptoKey> => {
    const saltRaw = localStorage.getItem(SALT_STORAGE_KEY);
    const verifierRaw = localStorage.getItem(VERIFIER_STORAGE_KEY);
    
    if (!saltRaw || !verifierRaw) throw new Error("No vault found");
    
    const salt = new Uint8Array(JSON.parse(saltRaw));
    const verifier = JSON.parse(verifierRaw);
    
    // نشتق المفتاح من الباسورد اللي كتبه
    const key = await deriveKey(password, salt);
    
    // نحاول نفك تشفير كلمة التحقق
    try {
        const check = await decryptDataRaw(verifier, key);
        if (check === "VALID") return key;
        throw new Error("Invalid Password");
    } catch (e) {
        throw new Error("كلمة المرور غير صحيحة");
    }
};

// --- دوال مساعدة (Helpers) ---

// اشتقاق مفتاح من الباسورد (PBKDF2)
const deriveKey = async (password: string, salt: Uint8Array): Promise<CryptoKey> => {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: salt, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: ALGORITHM_NAME, length: 256 },
        false, ["encrypt", "decrypt"]
    );
};

// دوال التشفير وفك التشفير باستخدام المفتاح المشتق
export const encryptDataRaw = async (data: any, key: CryptoKey): Promise<{iv: number[], data: number[]}> => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await window.crypto.subtle.encrypt({ name: ALGORITHM_NAME, iv }, key, encoded);
    return {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted))
    };
};

export const decryptDataRaw = async (cipherObj: {iv: number[], data: number[]}, key: CryptoKey): Promise<any> => {
    const iv = new Uint8Array(cipherObj.iv);
    const data = new Uint8Array(cipherObj.data);
    const decrypted = await window.crypto.subtle.decrypt({ name: ALGORITHM_NAME, iv }, key, data);
    return JSON.parse(new TextDecoder().decode(decrypted));
};

// --- wrappers للتوافق مع الكود القديم (String Based) ---

export const encryptData = async <T>(data: T, key: CryptoKey): Promise<string> => {
    const raw = await encryptDataRaw(data, key);
    
    // دمج IV مع البيانات وتحويلهم لـ Base64
    const combined = new Uint8Array(raw.iv.length + raw.data.length);
    combined.set(new Uint8Array(raw.iv));
    combined.set(new Uint8Array(raw.data), raw.iv.length);
    
    let binary = '';
    const bytes = combined;
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    return ENC_PREFIX + window.btoa(binary);
};

export const decryptData = async <T>(cipherText: string, key: CryptoKey): Promise<T | null> => {
    // دعم البيانات القديمة غير المشفرة أو المشفرة بالطريقة القديمة (اختياري، هنا نفترض الجديد فقط للامان)
    if (!cipherText.startsWith(ENC_PREFIX)) {
         return null; 
    }

    try {
        const base64 = cipherText.slice(ENC_PREFIX.length);
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        
        // استخراج IV (12 bytes)
        const iv = Array.from(bytes.slice(0, 12));
        const data = Array.from(bytes.slice(12));
        
        return await decryptDataRaw({ iv, data }, key);
    } catch (e) {
        console.error("Decryption string failed", e);
        return null;
    }
};

export const isEncryptedString = (str: string) => str.startsWith(ENC_PREFIX);