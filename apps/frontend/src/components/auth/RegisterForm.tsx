import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';

interface RegisterFormProps {
  onSuccess?: () => void;
  onSwitchToLogin?: () => void;
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [localError, setLocalError] = useState('');

  const { register, isLoading, error, clearError } = useAuthStore();

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setLocalError('');
    clearError();
  };

  const validateForm = () => {
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setLocalError('Please fill in all fields');
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }

    if (formData.password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
      });
      onSuccess?.();
    } catch (err) {
      // Error is handled by the store
    }
  };

  const displayError = error || localError;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              placeholder="John"
              disabled={isLoading}
              required
            />
            
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              placeholder="Doe"
              disabled={isLoading}
              required
            />
          </div>
          
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={handleChange('email')}
            placeholder="john@example.com"
            disabled={isLoading}
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={formData.password}
            onChange={handleChange('password')}
            placeholder="Enter your password"
            disabled={isLoading}
            required
          />
          
          <Input
            label="Confirm Password"
            type="password"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            placeholder="Confirm your password"
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
            Create Account
          </Button>

          {onSwitchToLogin && (
            <div className="text-center">
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm text-primary-600 hover:text-primary-500"
                disabled={isLoading}
              >
                Already have an account? Sign in
              </button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}