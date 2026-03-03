/**
 * useTokenSync.ts
 *
 * Хук, который подключает Clerk JWT-токен к dbService.
 * Должен вызываться ОДИН РАЗ в корневом компоненте (App.tsx).
 *
 * ABAP-аналогия: это как SET PARAMETER ID 'ZSC_TOKEN' FIELD lv_token
 * в начале сессии — один раз записали, везде читается автоматически.
 *
 * Использование в App.tsx:
 *   import { useTokenSync } from './hooks/useTokenSync';
 *   // В начале компонента App:
 *   useTokenSync();
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenProvider } from '../services/dbService';

export function useTokenSync() {
  const { getToken } = useAuth();

  useEffect(() => {
    // Регистрируем провайдер токена в dbService.
    // Теперь при каждом API-вызове dbService получит свежий токен.
    // Clerk автоматически обновляет токен если он истёк.
    setTokenProvider(() => getToken());

    return () => {
      // При размонтировании (выход из системы) — очищаем провайдер
      setTokenProvider(async () => null);
    };
  }, [getToken]);
}
