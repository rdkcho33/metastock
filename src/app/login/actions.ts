'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        // Kembalikan ke halaman login dengan format error url parameter
        redirect('/login?error=Lupa password atau kredensial salah.')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard/metadata-microstock')
}

export async function signup(formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    })

    if (error) {
        redirect(`/login?error=${error.message}`)
    }

    // Jika Supabase require Email Confirmation, session akan menjadi null
    if (data?.user && !data?.session) {
        redirect('/login?message=Berhasil mendaftar! Silakan cek kotak masuk email Anda dan klik link konfirmasi untuk mulai menggunakan aplikasi.')
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard/metadata-microstock')
}

export async function logout() {
    const supabase = await createClient()
    await supabase.auth.signOut()

    redirect('/login')
}
