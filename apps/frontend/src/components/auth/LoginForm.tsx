import { useState } from 'react';
import { useLogin } from '@/hooks/api';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import toast from 'react-hot-toast';

interface LoginFormProps {
  onSuccess?: () => void;
  onSwitchToRegister?: () => void;
  onSwitchToForgotPassword?: () => void;
}

export function LoginForm({ onSuccess, onSwitchToRegister, onSwitchToForgotPassword }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  const loginMutation = useLogin();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    try {
      await loginMutation.mutateAsync({ email, password });
      toast.success('Login successful!');
      onSuccess?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      toast.error(errorMessage);
      setLocalError(errorMessage);
    }
  };

  const displayError = loginMutation.error?.message || localError;

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
            disabled={loginMutation.isPending}
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loginMutation.isPending}
            required
          />

          {displayError && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {displayError}
            </div>
          )}

          <Button
            type="submit"
            loading={loginMutation.isPending}
            className="w-full"
          >
            Sign In
          </Button>

          {onSwitchToForgotPassword && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToForgotPassword}
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                disabled={loginMutation.isPending}
              >
                Forgot your password?
              </button>
            </div>
          )}

          {onSwitchToRegister && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToRegister}
                className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300"
                disabled={loginMutation.isPending}
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