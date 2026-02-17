'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export async function login(formData: FormData) {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    if (email === "leader.fabio@gmail.com" && password === "eamsjc73") {
        // Set cookie valid for 1 day
        const oneDay = 24 * 60 * 60 * 1000;

        // Await cookies() since it's an async function in newer Next.js versions or just good practice
        const cookieStore = await cookies();

        cookieStore.set('auth', 'true', {
            path: '/',
            httpOnly: false, // Allow client-side access if needed (current app uses it in layout/page)
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: oneDay
        });

        redirect('/');
    } else {
        return { error: 'Credenciais inválidas' };
    }
}
