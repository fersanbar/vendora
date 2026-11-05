import { supabase } from '@/lib/supabase'

export interface Channel {
  id: string
  nombre: string
  tipo: string
  activo: boolean
}

const COLUMNAS = 'id, nombre, tipo, activo'

export async function listChannels(): Promise<Channel[]> {
  const { data, error } = await supabase.from('channels').select(COLUMNAS).order('nombre')
  if (error) throw error
  return data as Channel[]
}

export async function createChannel(nombre: string): Promise<Channel> {
  const { data, error } = await supabase
    .from('channels')
    .insert({ nombre, tipo: 'otro' })
    .select(COLUMNAS)
    .single()
  if (error) throw error
  return data as Channel
}

export async function setChannelActive(id: string, activo: boolean): Promise<void> {
  const { error } = await supabase.from('channels').update({ activo }).eq('id', id)
  if (error) throw error
}

export async function deleteChannel(id: string): Promise<void> {
  const { error } = await supabase.from('channels').delete().eq('id', id)
  if (error) throw error
}