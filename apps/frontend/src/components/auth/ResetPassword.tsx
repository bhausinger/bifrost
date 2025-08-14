import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useResetPassword } from '@/hooks/api/usePasswordReset';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import toast from 'react-hot-toast';

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [token, setToken] = useState('');

  const resetPasswordMutation = useResetPassword();

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      toast.error('Invalid reset link');
      navigate('/auth');
    }
  }, [searchParams, navigate]);

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) {
      return 'Password must be at least 8 characters long';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('Invalid reset token');
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      await resetPasswordMutation.mutateAsync({ token, newPassword });
      toast.success('Password reset successfully!');
      navigate('/auth');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(errorMessage);
    }
  };

  const passwordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength <= 2) return 'bg-red-500';
    if (strength <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Medium';
    return 'Strong';
  };

  const strength = passwordStrength(newPassword);

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Reset Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter your new password below.
          </div>
          
          <div>
            <Input
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              disabled={resetPasswordMutation.isPending}
              required
            />
            
            {newPassword && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                  <span>Password strength:</span>
                  <span className={`font-medium ${
                    strength <= 2 ? 'text-red-600' : 
                    strength <= 3 ? 'text-yellow-600' : 
                    'text-green-600'
                  }`}>
                    {getStrengthText(strength)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength)}`}
                    style={{ width: `${(strength / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={resetPasswordMutation.isPending}
            required
          />

          {confirmPassword && newPassword !== confirmPassword && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Passwords do not match
            </div>
          )}

          <Button
            type="submit"
            loading={resetPasswordMutation.isPending}
            disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full"
          >
            Reset Password
          </Button>

          <Button
            type="button"
            onClick={() => navigate('/auth')}
            variant="ghost"
            className="w-full"
          >
            Back to Login
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}