export const saveToSession = (key: string, value: unknown) => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to sessionStorage:', e);
  }
};

export const loadFromSession = <T>(key: string, defaultValue: T): T => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    console.error('Failed to load from sessionStorage:', e);
    return defaultValue;
  }
};
