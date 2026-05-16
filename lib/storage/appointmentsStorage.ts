import { Appointment } from '@/lib/types';

let _tenantPrefix = 'shared';
export function setAppointmentsTenantPrefix(prefix: string) {
  _tenantPrefix = prefix;
}

function key() {
  return `${_tenantPrefix}_appointments`;
}

function readAll(): Appointment[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key()) ?? '[]') as Appointment[];
  } catch {
    return [];
  }
}

function writeAll(data: Appointment[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key(), JSON.stringify(data));
}

function genId() {
  return `apt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export const appointmentsStorage = {
  getAll(): Appointment[] {
    return readAll().sort((a, b) => {
      const da = `${a.date}T${a.time}`;
      const db = `${b.date}T${b.time}`;
      return da.localeCompare(db);
    });
  },

  getById(id: string): Appointment | null {
    return readAll().find((a) => a.id === id) ?? null;
  },

  create(data: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const all = readAll();
    const apt: Appointment = {
      ...data,
      id: genId(),
      createdAt: new Date().toISOString(),
    };
    writeAll([...all, apt]);
    return apt;
  },

  update(id: string, updates: Partial<Appointment>): Appointment | null {
    const all = readAll();
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    all[idx] = { ...all[idx], ...updates };
    writeAll(all);
    return all[idx];
  },

  delete(id: string): void {
    writeAll(readAll().filter((a) => a.id !== id));
  },
};
