import React from 'react';

interface LoadingScreenProps {
  /** Текст под спиннером. По умолчанию 'Loading...' */
  message?: string;
}

/**
 * Полноэкранный экран загрузки.
 *
 * ABAP-аналогия: CALL FUNCTION 'SAPGUI_PROGRESS_INDICATOR'
 * или сообщение типа 'I' (Information) во время длительной операции.
 *
 * Используется в трёх случаях из App.tsx:
 *  1. Clerk ещё инициализируется (!isLoaded)
 *  2. Роль пользователя проверяется (userRole === null)
 *  3. Данные загружаются (dataLoading)
 *
 * @example
 *   if (!isLoaded) return <LoadingScreen />;
 *   if (userRole === null) return <LoadingScreen message="Checking access..." />;
 */
const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <i className="fa-solid fa-spinner fa-spin text-4xl text-indigo-600 mb-4"></i>
        <p className="text-slate-600 font-medium">{message}</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
