import { useEffect, useState, useCallback } from 'react';
import { checkServerVersion, getLocalVersion, setLocalVersion, forceAppUpdate } from '@/utils/versionManager';
import { toast } from 'sonner';

export function useAutoUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isCritical, setIsCritical] = useState(false);
  const [checking, setChecking] = useState(true);

  const performCheck = useCallback(async (isInitial = false) => {
    const serverInfo = await checkServerVersion();
    if (!serverInfo) {
      setChecking(false);
      return;
    }

    const localVersion = getLocalVersion();
    
    // Se não houver versão local, define a do servidor (primeira execução)
    if (!localVersion) {
      setLocalVersion(serverInfo.version);
      setChecking(false);
      return;
    }

    if (serverInfo.version !== localVersion) {
      console.log(`Nova versão detectada: ${serverInfo.version} (Local: ${localVersion})`);
      setUpdateAvailable(true);
      setIsCritical(serverInfo.critical);

      if (serverInfo.critical) {
        toast.error("Atualização crítica obrigatória detectada! Reiniciando...", {
          duration: 5000,
        });
        setTimeout(() => {
          setLocalVersion(serverInfo.version);
          forceAppUpdate();
        }, 3000);
      } else if (isInitial) {
        toast.info("Uma nova versão do jogo está disponível!", {
          action: {
            label: "Atualizar Agora",
            onClick: () => {
              setLocalVersion(serverInfo.version);
              forceAppUpdate();
            }
          },
          duration: 10000,
        });
      }
    }
    
    setChecking(false);
  }, []);

  useEffect(() => {
    // Verificação inicial
    performCheck(true);

    // Verificação periódica a cada 10 minutos
    const interval = setInterval(() => performCheck(false), 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [performCheck]);

  const updateNow = () => {
    forceAppUpdate();
  };

  return { updateAvailable, isCritical, checking, updateNow };
}
