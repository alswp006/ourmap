import AsyncStorage from "@react-native-async-storage/async-storage";

const PREFIX = "ourmap_";

export async function getItem(key: string): Promise<string | null> {
  return AsyncStorage.getItem(PREFIX + key);
}

export async function setItem(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, value);
}

export async function removeItem(key: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIX + key);
}

export async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(PREFIX + key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export async function setJSON<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(PREFIX + key, JSON.stringify(value));
}
