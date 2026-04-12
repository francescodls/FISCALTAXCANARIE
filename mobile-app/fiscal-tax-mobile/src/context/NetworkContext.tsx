import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { COLORS, SPACING } from '../config/constants';

interface NetworkContextType {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  connectionType: string | null;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
});

export const useNetwork = () => useContext(NetworkContext);

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({ children }) => {
  const [networkState, setNetworkState] = useState<NetworkContextType>({
    isConnected: true,
    isInternetReachable: true,
    connectionType: null,
  });
  const [showBanner, setShowBanner] = useState(false);
  const bannerAnim = useState(new Animated.Value(-60))[0];

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      const isInternetReachable = state.isInternetReachable ?? false;
      
      setNetworkState({
        isConnected,
        isInternetReachable,
        connectionType: state.type,
      });

      // Show/hide offline banner
      if (!isConnected || isInternetReachable === false) {
        setShowBanner(true);
        Animated.spring(bannerAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }).start();
      } else {
        Animated.timing(bannerAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setShowBanner(false));
      }
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      setNetworkState({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
        connectionType: state.type,
      });
    });

    return () => unsubscribe();
  }, []);

  return (
    <NetworkContext.Provider value={networkState}>
      {children}
      {showBanner && (
        <Animated.View 
          style={[
            styles.offlineBanner,
            { transform: [{ translateY: bannerAnim }] }
          ]}
        >
          <WifiOff size={18} color="#fff" />
          <Text style={styles.offlineText}>
            Sei offline. Alcuni dati potrebbero non essere aggiornati.
          </Text>
        </Animated.View>
      )}
    </NetworkContext.Provider>
  );
};

// Hook per verificare se l'operazione dovrebbe essere bloccata offline
export const useRequireNetwork = () => {
  const { isConnected, isInternetReachable } = useNetwork();
  
  const checkNetwork = (): boolean => {
    return isConnected && isInternetReachable !== false;
  };
  
  const showOfflineAlert = (callback?: () => void) => {
    // You could show an alert here
    console.log('[Network] Operation blocked - offline');
    callback?.();
  };
  
  return { checkNetwork, showOfflineAlert, isOnline: checkNetwork() };
};

const styles = StyleSheet.create({
  offlineBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: 50, // Account for status bar
    gap: 8,
    zIndex: 9999,
  },
  offlineText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
});
