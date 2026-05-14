const AUTH_KEY = 'talabk_auth_v1';
const SESSION_KEY = 'talabk_session_v1';

interface StoredAuth {
  username: string;
  passwordHash: string;
  salt: string;
}

function generateSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const authService = {
  isSetupDone(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(AUTH_KEY) !== null;
  },

  isLoggedIn(): boolean {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  },

  async setup(username: string, password: string): Promise<void> {
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const stored: StoredAuth = { username, passwordHash, salt };
    localStorage.setItem(AUTH_KEY, JSON.stringify(stored));
    sessionStorage.setItem(SESSION_KEY, 'true');
  },

  async login(username: string, password: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const stored: StoredAuth = JSON.parse(raw);
    if (stored.username !== username) return false;
    const hash = await hashPassword(password, stored.salt);
    if (hash !== stored.passwordHash) return false;
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  },

  logout(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SESSION_KEY);
  },

  getUsername(): string | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const stored: StoredAuth = JSON.parse(raw);
    return stored.username;
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const stored: StoredAuth = JSON.parse(raw);
    const oldHash = await hashPassword(oldPassword, stored.salt);
    if (oldHash !== stored.passwordHash) return false;
    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const updated: StoredAuth = { username: stored.username, passwordHash: newHash, salt: newSalt };
    localStorage.setItem(AUTH_KEY, JSON.stringify(updated));
    return true;
  },

  changeUsername(newUsername: string): void {
    if (typeof window === 'undefined') return;
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return;
    const stored: StoredAuth = JSON.parse(raw);
    stored.username = newUsername;
    localStorage.setItem(AUTH_KEY, JSON.stringify(stored));
  },
};
