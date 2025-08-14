import { useState } from 'react';
import { useForgotPassword } from '@/hooks/api/usePasswordReset';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import toast from 'react-hot-toast';

interface ForgotPasswordProps {
  onBackToLogin?: () => void;
}

export function ForgotPassword({ onBackToLogin }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const forgotPasswordMutation = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      const response = await forgotPasswordMutation.mutateAsync(email);
      toast.success('Password reset email sent!');
      setSubmitted(true);
      
      // In development, show the reset URL
      if (response.data.resetUrl && process.env.NODE_ENV === 'development') {
        console.log('Development reset URL:', response.data.resetUrl);
        toast.success('Check console for reset link (development only)');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      toast.error(errorMessage);
    }
  };

  if (submitted) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Check Your Email</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <div className="text-green-600 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              If an account with <strong>{email}</strong> exists, you will receive a password reset link.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              Check your email and follow the instructions to reset your password.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button
              onClick={() => {
                setSubmitted(false);
                setEmail('');
              }}
              variant="outline"
              className="w-full"
            >
              Send Another Email
            </Button>
            
            {onBackToLogin && (
              <Button
                onClick={onBackToLogin}
                variant="ghost"
                className="w-full"
              >
                Back to Login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Enter your email address and we'll send you a link to reset your password.
          </div>
          
          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            disabled={forgotPasswordMutation.isPending}
            required
          />

          <Button
            type="submit"
            loading={forgotPasswordMutation.isPending}
            className="w-full"
          >
            Send Reset Link
          </Button>

          {onBackToLogin && (
            <Button
              type="button"
              onClick={onBackToLogin}
              variant="ghost"
              className="w-full"
            >
              Back to Login
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}