import { NextResponse } from 'next/server';
import { TimetableDatabase } from '@/lib/database';
import { User } from '@/app/types';

async function getAppUsers(): Promise<User[]> {
    return await TimetableDatabase.getAppUsers();
}

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const users = await getAppUsers();
        const user = users.find((u: any) => u.username === username && u.password === password);

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
        }

        const { password: _, ...safeUser } = user;
        return NextResponse.json({ user: safeUser });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
