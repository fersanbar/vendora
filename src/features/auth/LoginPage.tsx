
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import {
  Loader2,
  ArrowRight,
  Boxes,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { useAuth } from './useAuth'

function traducirError(msg: string): string {
  if (msg.includes('Invalid login credentials'))
    return 'Correo o contraseña incorrectos.'
  if (msg.includes('already registered'))
    return 'Ese correo ya tiene una cuenta.'
  if (msg.includes('at least'))
    return 'La contraseña debe tener al menos 8 caracteres.'

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

    try {
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) setError(traducirError(error.message))
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          setError(traducirError(error.message))
        } else if (!data.session) {
          setAviso('Cuenta creada. Revisa tu correo para confirmarla.')
        }
      }
    } catch {
      setError('Ocurrió un problema de conexión. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-2">
      {/* Panel de marca */}
      <section className="relative hidden min-h-dvh flex-col justify-between overflow-hidden bg-gradient-to-br from-[#101C46] via-[#172554] to-[#39236F] p-12 text-white lg:flex xl:p-16">
        <div className="pointer-events-none absolute -right-32 top-20 size-[420px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-20 top-32 size-[320px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-48 -left-24 size-[420px] rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
            <Boxes className="size-6 text-violet-200" />
          </div>
          <span className="text-xl font-bold tracking-[0.12em]">
            VENDORA
          </span>
        </div>

        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-violet-100">
            <span className="size-1.5 rounded-full bg-violet-300" />
            Gestión inteligente de negocios
          </span>

          <h1 className="mt-7 text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
            Tu negocio.
            <br />
            Tus números.
            <br />
            <span className="text-violet-300">Tu crecimiento.</span>
          </h1>

          <p className="mt-6 max-w-md text-base leading-relaxed text-indigo-100/75">
            Centraliza tus ventas, inventario y finanzas en un solo lugar.
            Toma decisiones con claridad y haz crecer tu negocio.
          </p>

          <div className="mt-10 space-y-5">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                <TrendingUp className="size-4 text-violet-200" />
              </div>
              <span className="text-sm text-indigo-100">
                Analiza tus ganancias y rentabilidad
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                <Boxes className="size-4 text-violet-200" />
              </div>
              <span className="text-sm text-indigo-100">
                Controla productos e inventario
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                <ShieldCheck className="size-4 text-violet-200" />
              </div>
              <span className="text-sm text-indigo-100">
                Mantén tu operación organizada
              </span>
            </div>
          </div>
        </div>

        <p className="relative text-xs text-indigo-200/50">
          VENDORA · Gestión de negocios
        </p>
      </section>

      {/* Formulario */}
      <section className="flex min-h-dvh items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {/* Marca móvil */}
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#172554] to-[#6336A9] text-white shadow-lg shadow-indigo-900/15">
              <Boxes className="size-6" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-[0.12em] text-[#172554]">
                VENDORA
              </p>
              <p className="text-xs text-slate-500">
                Tu negocio. Tus números. Tu crecimiento.
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-600">
              {modo === 'entrar' ? 'Bienvenido de nuevo' : 'Únete a VENDORA'}
            </p>

            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {modo === 'entrar' ? 'Inicia sesión' : 'Crea tu cuenta'}
            </h2>

            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {modo === 'entrar'
                ? 'Ingresa tus datos para continuar administrando tu negocio.'
                : 'Comienza a organizar y controlar tu negocio desde un solo lugar.'}
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-semibold text-slate-700"
              >
                Correo electrónico
              </Label>

              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@correo.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm shadow-sm transition placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:ring-violet-200"
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-semibold text-slate-700"
              >
                Contraseña
              </Label>

              <Input
                id="password"
                type="password"
                required
                autoComplete={
                  modo === 'entrar' ? 'current-password' : 'new-password'
                }
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 rounded-xl border-slate-200 bg-white px-4 text-sm shadow-sm transition placeholder:text-slate-400 focus-visible:border-violet-400 focus-visible:ring-violet-200"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                {error}
              </p>
            )}

            {aviso && (
              <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {aviso}
              </p>
            )}

            <Button
              type="submit"
              disabled={enviando}
              className="h-12 w-full rounded-xl bg-[#172554] text-sm font-semibold text-white shadow-md shadow-indigo-950/10 transition hover:bg-[#263b78] disabled:opacity-60"
            >
              {enviando ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  {modo === 'entrar' ? 'Entrar a VENDORA' : 'Crear cuenta'}
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </form>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs text-slate-400">O</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <p className="text-center text-sm text-slate-500">
            {modo === 'entrar'
              ? '¿Todavía no tienes una cuenta?'
              : '¿Ya tienes una cuenta?'}
          </p>

          <button
            type="button"
            className="mt-2 w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-violet-700 transition hover:border-violet-200 hover:bg-violet-50"
            onClick={() => {
              setModo(modo === 'entrar' ? 'crear' : 'entrar')
              setError(null)
              setAviso(null)
            }}
          >
            {modo === 'entrar' ? 'Crear una cuenta' : 'Iniciar sesión'}
          </button>

          <p className="mt-8 text-center text-xs text-slate-400">
            Al continuar, estás utilizando VENDORA para gestionar tu negocio.
          </p>
        </div>
      </section>
    </main>
  )
}
