import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { WifiOff, Wifi } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000';

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Verificar conectividade do navegador
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setBackendAvailable(false);
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar disponibilidade do backend periodicamente
    const checkBackend = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${BACKEND_URL}/health`, {
          signal: controller.signal,
        }).catch(() => null);
        
        clearTimeout(timeoutId);
        
        const available = response?.ok ?? false;
        setBackendAvailable(available);
        
        // Mostrar alerta apenas se o estado mudou
        if (!available && backendAvailable) {
          setShowAlert(true);
        } else if (available && !backendAvailable) {
          setShowAlert(true);
          // Auto-ocultar alerta de reconexão após 5 segundos
          setTimeout(() => setShowAlert(false), 5000);
        }
      } catch (error) {
        setBackendAvailable(false);
        if (backendAvailable) {
          setShowAlert(true);
        }
      }
    };

    // Verificar imediatamente e depois a cada 30 segundos
    checkBackend();
    const interval = setInterval(checkBackend, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [backendAvailable]);

  if (!showAlert) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {!isOnline || !backendAvailable ? (
        <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800">
          <WifiOff className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
          <AlertDescription className="text-yellow-800 dark:text-yellow-200">
            {!isOnline 
              ? 'Sem conexão com a internet. Usando dados locais.'
              : 'Backend indisponível. Usando modo offline com localStorage.'}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
          <Wifi className="h-4 w-4 text-green-600 dark:text-green-500" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            Conexão restabelecida!
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
