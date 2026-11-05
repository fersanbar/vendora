import { createClient, type Session } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local')
}

export const supabase = createClient(url, key)

export function leerSesionGuardada(): Session | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const clave = localStorage.key(i)
      if (clave && /^sb-.+-auth-token$/.test(clave)) {
        const s = JSON.parse(localStorage.getItem(clave) ?? 'null') as Session | null
        if (s?.user) return s
      }
    }
  } catch {
    // Sin acceso a localStorage
  }
  return null
}