import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/apiClient';

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => apiClient.forgotPassword(email),
  });
};

export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) => 
      apiClient.resetPassword(token, newPassword),
  });
};