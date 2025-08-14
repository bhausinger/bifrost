import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await login(email, password);
      onSuccess?.();
    } catch (err) {
      // Error is handled by the store
    }
  };

  const displayError = error || localError;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={isLoading}
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />

          {displayError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {displayError}
            </div>
          )}

          <Button
            type="submit"
            loading={isLoading}
            className="w-full"
          >
            Sign In
          </Button>

          {onSwitchToRegister && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-sm text-primary-600 hover:text-primary-500"
                disabled={isLoading}
              >
                Don't have an account? Sign up
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}