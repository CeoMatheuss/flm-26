
export interface VersionInfo {
  version: string;
  critical: boolean;
  timestamp: number;
}

const VERSION_KEY = 'flm_app_version';

export const getLocalVersion = (): string | null => {
  return localStorage.getItem(VERSION_KEY);
};

export const setLocalVersion = (version: string) => {
  localStorage.setItem(VERSION_KEY, version);
};

export const checkServerVersion = async (): Promise<VersionInfo | null> => {
  try {
    // Adicionamos um timestamp para evitar cache do navegador ao buscar o JSON
    const response = await fetch(`/version.json?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) throw new Error('Falha ao buscar versão');
    return await response.json();
  } catch (error) {
    console.error('Erro ao verificar versão do servidor:', error);
    return null;
  }
};

export const forceAppUpdate = async () => {
  console.log('Forçando atualização do aplicativo...');
  
  try {
    // 1. Limpar caches do Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    
    // 2. Limpar Cache Storage
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
      }
    }
    
    // 3. Recarregar a página forçando bypass de cache
    window.location.reload();
  } catch (error) {
    console.error('Erro durante o processo de atualização:', error);
    window.location.reload();
  }
};
