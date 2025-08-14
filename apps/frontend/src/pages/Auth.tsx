import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPassword } from '@/components/auth/ForgotPassword';
import { ResetPassword } from '@/components/auth/ResetPassword';

type AuthMode = 'login' | 'register' | 'forgot-password';

export function Auth() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>('login');
  const { isAuthenticated } = useAuthStore();

  // Check if this is a password reset flow
  const token = searchParams.get('token');
  const isResetPassword = !!token;

  // Redirect if already authenticated (but not during password reset)
  if (isAuthenticated && !isResetPassword) {
    return <Navigate to="/" replace />;
  }

  const handleAuthSuccess = () => {
    // The redirect will happen automatically due to the Navigate above
    // when isAuthenticated becomes true
  };

  // Render password reset if token is present
  if (isResetPassword) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Campaign Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Reset your password
            </p>
          </div>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <ResetPassword />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Campaign Manager
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your music promotion campaigns
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'login' ? (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
            onSwitchToForgotPassword={() => setMode('forgot-password')}
          />
        ) : mode === 'register' ? (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        ) : (
          <ForgotPassword
            onBackToLogin={() => setMode('login')}
          />
        )}
      </div>
    </div>
  );
}