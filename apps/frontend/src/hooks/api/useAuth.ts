import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, LoginData, RegisterData } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';

export const useLogin = () => {
  const { setUser, setToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginData) => apiClient.login(data),
    onSuccess: (response) => {
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['artists'] });
    },
  });
};

export const useRegister = () => {
  const { setUser, setToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: RegisterData) => apiClient.register(data),
    onSuccess: (response) => {
      const { user, token } = response.data;
      setUser(user);
      setToken(token);
      
      // Invalidate and refetch user-related queries
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      logout();
      
      // Clear all cached data on logout
      queryClient.clear();
    },
    onError: () => {
      // Even if the API call fails, we should clear local state
      logout();
      queryClient.clear();
    },
  });
};

export const useRefreshToken = () => {
  const { setUser, setToken } = useAuthStore();

  return useMutation({
    mutationFn: (refreshToken: string) => apiClient.refreshToken(refreshToken),
    onSuccess: (response) => {
      const { user, accessToken } = response.data;
      setUser(user);
      setToken(accessToken);
    },
  });
};