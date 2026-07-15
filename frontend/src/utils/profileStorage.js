const STORAGE_KEY = 'pickleball-coach-dna-profile';

export function saveUserProfile(profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* ignore quota errors */
  }
}

export function loadUserProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUserProfile() {
  localStorage.removeItem(STORAGE_KEY);
}
