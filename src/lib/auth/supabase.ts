import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseClient() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase configuration is missing.");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          for (const { name, value, options } of values) store.set(name, value, options);
        } catch {
          // Server components cannot write cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}
