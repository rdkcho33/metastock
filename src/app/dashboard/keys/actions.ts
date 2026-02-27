'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addApiKey(formData: FormData) {
    try {
        const supabase = await createClient()
        const { data, error: authError } = await supabase.auth.getUser()
        const user = data?.user

        if (!user || authError) {
            console.error('Auth check failed:', authError)
            return { error: 'Sesi anda telah berakhir. Silakan login kembali.' }
        }

        const provider = formData.get('provider') as string
        const name = formData.get('name') as string
        const raw_key = formData.get('key_value') as string
        const key_value = raw_key?.trim()

        if (!provider || !key_value) {
            return { error: 'Provider dan Nilai Kunci wajib diisi.' }
        }

        console.log('Inserting key for user:', user.id);
        const insertData = {
            user_id: user.id,
            provider,
            name: name || `${provider === 'groq' ? 'Groq' : 'Gemini'} Key`,
            key_value,
            status: 'active',
            usage_count: 0
        };

        const { error: dbError } = await supabase
            .from('api_keys')
            .insert(insertData)

        if (dbError) {
            console.error('Database Error adding key:', dbError)
            return { error: `Database Error: ${dbError.message}` }
        }

        revalidatePath('/dashboard/keys')
        return { success: true }
    } catch (err: any) {
        console.error('Unhandled Action Error:', err)
        return { error: `Internal Error: ${err.message}` }
    }
}

export async function deleteApiKey(id: string) {
    try {
        const supabase = await createClient()
        const { data, error: authError } = await supabase.auth.getUser()
        const user = data?.user

        if (!user || authError) {
            return { error: 'Sesi anda telah berakhir.' }
        }

        const { error: dbError } = await supabase
            .from('api_keys')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)

        if (dbError) {
            console.error('Error deleting key:', dbError)
            return { error: dbError.message }
        }

        revalidatePath('/dashboard/keys')
        return { success: true }
    } catch (err: any) {
        console.error('Unhandled Delete Action Error:', err)
        return { error: err.message }
    }
}
