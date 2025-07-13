// Utilidades para manejo de errores comunes en la aplicación

export interface AppError {
  code: string;
  message: string;
  userMessage: string;
}

export class ErrorHandler {
  static handleFirebaseError(error: any): AppError {
    console.error('Firebase Error:', error);
    
    // Errores comunes de Firebase
    if (error?.code) {
      switch (error.code) {
        case 'permission-denied':
          return {
            code: 'permission-denied',
            message: error.message,
            userMessage: 'Non tes permisos para realizar esta acción. Asegúrate de estar autenticado.'
          };
        case 'network-request-failed':
          return {
            code: 'network-error',
            message: error.message,
            userMessage: 'Problema de conexión. Verifica tu conexión a internet.'
          };
        case 'unavailable':
          return {
            code: 'service-unavailable',
            message: error.message,
            userMessage: 'O servizo non está dispoñible temporalmente. Inténtao máis tarde.'
          };
        default:
          return {
            code: error.code,
            message: error.message,
            userMessage: `Erro de Firebase: ${error.message}`
          };
      }
    }
    
    // Errores de red
    if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
      return {
        code: 'network-error',
        message: error.message,
        userMessage: 'Problema de conexión. Verifica tu conexión a internet.'
      };
    }
    
    // Error genérico
    return {
      code: 'unknown-error',
      message: error?.message || 'Error desconocido',
      userMessage: 'Ocorreu un erro inesperado. Por favor, inténtao de novo.'
    };
  }
  
  static handleDataLoadError(context: string, error: any): AppError {
    console.error(`Error loading data in ${context}:`, error);
    
    const firebaseError = this.handleFirebaseError(error);
    
    return {
      ...firebaseError,
      userMessage: `Erro ao cargar datos en ${context}: ${firebaseError.userMessage}`
    };
  }
  
  static showUserError(error: AppError) {
    alert(error.userMessage);
  }
  
  static logError(context: string, error: any, additionalInfo?: any) {
    console.error(`Error in ${context}:`, {
      error,
      additionalInfo,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    });
  }
}
