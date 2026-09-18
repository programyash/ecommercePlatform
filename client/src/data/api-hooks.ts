import { useState, useEffect, useCallback } from 'react';
import type { QueryStatus } from './hooks';

export interface ApiQuery<T> {
  status: QueryStatus;
  data: T | undefined;
  retry: () => void;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

import { API_BASE_URL } from '@/lib/config';
import { determineRole, getAuthToken, ensureAuthToken } from '@/lib/auth-token';

const API_BASE = API_BASE_URL;

export function useApiQuery<T>(endpoint: string, deps: any[] = []): ApiQuery<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [status, setStatus] = useState<QueryStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  const retry = useCallback(() => {
    setStatus('loading');
    setAttempt((v) => v + 1);
  }, []);

  useEffect(() => {
    let active = true;
    setStatus('loading');

    const role = determineRole(endpoint);

    async function fetchData() {
      try {
        let token = getAuthToken(role);
        if (!token) {
          token = await ensureAuthToken(role);
        }

        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        let res = await fetch(`${API_BASE}${endpoint}`, { headers });

        // If unauthorized/forbidden, refresh token for this role and retry once
        if (res.status === 401 || res.status === 403) {
          console.warn(`[useApiQuery] Received ${res.status} on ${endpoint}. Refreshing token for role: ${role}...`);
          token = await ensureAuthToken(role, true);
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            res = await fetch(`${API_BASE}${endpoint}`, { headers });
          }
        }

        if (res.status === 404) {
          if (!active) return;
          setData(undefined);
          setStatus('empty');
          return;
        }

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        if (!active) return;
        const result = json.data;
        setData(result);
        if (result === null || result === undefined || (Array.isArray(result) && result.length === 0) || (result.items && result.items.length === 0)) {
          setStatus('empty');
        } else {
          setStatus('success');
        }
      } catch (err) {
        console.error("API Error:", err);
        if (active) setStatus('error');
      }
    }

    fetchData();

    return () => { active = false; };
  }, [endpoint, attempt, ...deps]);

  return {
    status,
    data,
    retry,
    isLoading: status === 'loading',
    isError: status === 'error',
    isEmpty: status === 'empty',
  };
}
