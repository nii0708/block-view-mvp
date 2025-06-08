import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../config/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 Processing OAuth callback...');
        
        // Extract the session from URL parameters if present
        if (params.access_token) {
          console.log('✅ Access token found in URL');
          
          const { data, error } = await supabase.auth.setSession({
            access_token: params.access_token as string,
            refresh_token: params.refresh_token as string,
          });

          if (error) {
            console.error('❌ Error setting session:', error);
            router.replace('/auth/login?error=callback_error');
            return;
          }

          console.log('✅ Session set successfully');
          router.replace('/');
        } else {
          console.log('❌ No access token found, redirecting to login');
          router.replace('/auth/login');
        }
      } catch (error) {
        console.error('❌ Callback error:', error);
        router.replace('/auth/login?error=callback_error');
      }
    };

    handleAuthCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#CFE625" />
      <Text style={styles.text}>Menyelesaikan login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});