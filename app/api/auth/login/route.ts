
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { User } from '../../../types';

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function getUsers(): User[] {
    if (!fs.existsSync(USERS_FILE)) {
        return [];
    }
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
        }

        const users = getUsers();
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 });
        }

        const { password: _, ...safeUser } = user;
        return NextResponse.json({ user: safeUser });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
