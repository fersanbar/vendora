import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuth } from './useAuth'

function traducirError(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('already registered')) return 'Ese correo ya tiene una cuenta.'
  if (msg.includes('at least')) return 'La contraseña debe tener al menos 8 caracteres.'
  return 'No se pudo completar la operación. Intenta de nuevo.'
}

export function LoginPage() {
  const { session, loading } = useAuth()
  const [modo, setModo] = useState<'entrar' | 'crear'>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setEnviando(true)
    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traducirError(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error) setError(traducirError(error.message))
      else if (!data.session) setAviso('Cuenta creada. Revisa tu correo para confirmarla.')
    }
    setEnviando(false)
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6">
      <h1 className="text-3xl font-semibold tracking-tight">VENDORA</h1>
      <p className="mt-1 text-sm text-neutral-500">Controla tu negocio desde el teléfono.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" required
            value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" required
            autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'}
            value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>

        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {aviso && <p className="text-sm text-emerald-600">{aviso}</p>}

        <Button type="submit" disabled={enviando} className="h-11 w-full">
          {enviando && <Loader2 className="mr-2 size-4 animate-spin" />}
          {modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
        </Button>
      </form>

      <button
        type="button"
        className="mt-6 text-sm text-neutral-500 underline-offset-4 hover:underline"
        onClick={() => { setModo(modo === 'entrar' ? 'crear' : 'entrar'); setError(null); setAviso(null) }}
      >
        {modo === 'entrar' ? '¿No tienes cuenta? Crear una' : '¿Ya tienes cuenta? Entrar'}
      </button>
    </main>
  )
}