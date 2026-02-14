import { NextRequest, NextResponse } from 'next/server';

// Version de test sans Supabase pour diagnostiquer
export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG API USERS (VERSION TEST) ===');
    
    // Test simple sans dépendances
    const testUsers = [
      {
        id: 'test-1',
        username: 'admin',
        email: 'admin@test.com',
        role: 'admin',
        name: 'Administrateur Test',
        is_active: true,
        created_at: new Date().toISOString(),
        last_login: null,
        failed_login_count: 0
      }
    ];

    console.log('Retour des utilisateurs de test:', testUsers.length);
    
    return NextResponse.json({
      message: 'Version de test - API fonctionne',
      users: testUsers,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erreur dans API de test:', error);
    return NextResponse.json(
      { 
        error: `Erreur serveur (test): ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: 'Fonction désactivée en mode test' },
    { status: 503 }
  );
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: 'Fonction désactivée en mode test' },
    { status: 503 }
  );
}
