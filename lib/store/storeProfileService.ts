const PROFILE_KEY = 'talabk_store_profile_v1';
const COUNTER_KEY = 'talabk_store_counter_v1';

export interface StoreProfile {
  storeId: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  snapchat: string;
  website: string;
}

export const storeProfileService = {
  getProfile(): StoreProfile | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoreProfile;
  },

  getOrCreateProfile(): StoreProfile {
    const existing = storeProfileService.getProfile();
    if (existing) return existing;

    const counter = parseInt(localStorage.getItem(COUNTER_KEY) ?? '100', 10);
    const nextCounter = counter + 1;
    localStorage.setItem(COUNTER_KEY, String(nextCounter));

    const newProfile: StoreProfile = {
      storeId: String(nextCounter),
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      facebook: '',
      instagram: '',
      twitter: '',
      tiktok: '',
      snapchat: '',
      website: '',
    };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
    return newProfile;
  },

  saveProfile(profile: StoreProfile): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  },
};
