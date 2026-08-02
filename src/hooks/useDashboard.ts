import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from '../types';

const GATEWAY = (import.meta as any).env?.VITE_API_URL || '';
const TOKEN_KEY = 'token';

function isAuthenticated(): boolean {
  const token = localStorage.getItem(TOKEN_KEY);
  return !!(token && token !== 'undefined' && token.trim().length > 10);
}

export async function getToken(): Promise<string> {
  let token = localStorage.getItem(TOKEN_KEY);
  if (!token || token === 'undefined' || token.trim().length < 10) {
    const res = await fetch(`${GATEWAY}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@farmalink.com', password: '1234' })
    });
    const data = await res.json();
    if (!res.ok || !data?.token) {
      throw new Error(data?.message || 'No se pudo iniciar sesión para el dashboard');
    }
    token = data.token;
    localStorage.setItem(TOKEN_KEY, token);
  }
  return token!;
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    const auth = isAuthenticated();
    const endpoint = auth ? '/api/dashboard' : '/api/home';
    const isProtected = auth;
    
    try {
      if (isProtected) {
        const token = await getToken();
        const res = await fetch(`${GATEWAY}${endpoint}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            localStorage.removeItem(TOKEN_KEY);
            const token2 = await getToken();
            const res2 = await fetch(`${GATEWAY}/api/dashboard`, {
              headers: { Authorization: `Bearer ${token2}` }
            });
            if (!res2.ok) throw new Error('Error fetching data');
            const d = await res2.json();
            setData(d);
            return;
          }
          throw new Error('Error fetching data');
        }
        const d = await res.json();
        setData(d);
      } else {
        const res = await fetch(`${GATEWAY}${endpoint}`);
        if (!res.ok) throw new Error('Error fetching data');
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook para manejar scroll y aplicar clase al header
 * @returns {void}
 */
export function useScrollEffect(): void {
  useEffect(() => {
    const handleScroll = () => {
      const header = document.getElementById('header');
      if (header) {
        header.classList.toggle('scrolled', window.scrollY > 50);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
}
