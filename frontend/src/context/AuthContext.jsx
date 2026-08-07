import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setDoctor(res.data.doctor))
      .catch(() => setDoctor(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    setDoctor(res.data.doctor);
    return res.data.doctor;
  };

  const register = async (formData) => {
    const res = await api.post('/auth/register', formData);
    setDoctor(res.data.doctor);
    return res.data.doctor;
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setDoctor(null);
  };

  return (
    <AuthContext.Provider value={{ doctor, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}