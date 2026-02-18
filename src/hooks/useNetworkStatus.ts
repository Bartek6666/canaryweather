import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkConnection = async () => {
      try {
        const networkState = await Network.getNetworkStateAsync();
        if (isMounted) {
          setIsConnected(networkState.isConnected ?? false);
        }
      } catch {
        if (isMounted) {
          setIsConnected(false);
        }
      }
    };

    // Initial check
    checkConnection();

    // Poll every 5 seconds (expo-network doesn't have listeners)
    const interval = setInterval(checkConnection, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isConnected, isOffline: isConnected === false };
}
