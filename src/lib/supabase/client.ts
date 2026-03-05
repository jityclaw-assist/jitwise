import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/config/env";

const getCookie = (name: string) => {
  const match = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split("=")[1] ?? "") : null;
};

const getAllCookies = () =>
  document.cookie
    .split("; ")
    .filter(Boolean)
    .map((cookie) => {
      const [name, ...rest] = cookie.split("=");
      return {
        name,
        value: decodeURIComponent(rest.join("=")),
      };
    });

export const createSupabaseBrowserClient = () =>
  createBrowserClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      get(name) {
        return getCookie(name);
      },
      set(name, value, options) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        if (options?.path) cookie += `; Path=${options.path}`;
        if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
        if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
        if (options?.secure) cookie += "; Secure";
        document.cookie = cookie;
      },
      remove(name, options) {
        const path = options?.path ?? "/";
        document.cookie = `${name}=; Path=${path}; Max-Age=0`;
      },
      getAll() {
        return getAllCookies();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          let cookie = `${name}=${encodeURIComponent(value)}`;
          if (options?.path) cookie += `; Path=${options.path}`;
          if (options?.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`;
          if (options?.sameSite) cookie += `; SameSite=${options.sameSite}`;
          if (options?.secure) cookie += "; Secure";
          document.cookie = cookie;
        });
      },
    },
  });
