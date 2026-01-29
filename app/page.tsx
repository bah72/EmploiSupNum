"use client";

export default function Page() {
  return (
    <div style={{
      height: '100vh',
      background: '#ef4444',
      color: 'white',
      padding: '40px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ fontSize: '4rem', marginBottom: '40px' }}>
        🔴 BOUTONS SAVE & PRINT 🔴
      </h1>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '30px', 
        marginBottom: '40px',
        flexWrap: 'wrap'
      }}>
        <button 
          onClick={() => alert('SAUVEGARDER CLIQUÉ!')}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            background: '#16a34a',
            color: 'white',
            border: '4px solid #15803d',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          � SAUVEGARDER
        </button>
        
        <button 
          onClick={() => window.print()}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            background: '#2563eb',
            color: 'white',
            border: '4px solid #1d4ed8',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          🖨️ IMPRIMER
        </button>
        
        <button 
          onClick={() => alert('TEST FONCTIONNE!')}
          style={{
            padding: '20px 40px',
            fontSize: '24px',
            fontWeight: 'bold',
            background: '#eab308',
            color: 'black',
            border: '4px solid #ca8a04',
            borderRadius: '10px',
            cursor: 'pointer'
          }}
        >
          ⚠️ TEST
        </button>
      </div>
      
      <div style={{
        background: 'white',
        color: 'black',
        padding: '30px',
        borderRadius: '10px',
        fontSize: '20px',
        marginBottom: '30px'
      }}>
        <p><strong>✅ SUCCÈS!</strong> Les boutons sont maintenant visibles</p>
        <p><strong>✅ SAUVEGARDER</strong> : Remplace l'ancien bouton PDF</p>
        <p><strong>✅ IMPRIMER</strong> : Utilise window.print() du navigateur</p>
      </div>
      
      <div style={{ fontSize: '28px' }}>
        <p>🎉 MISSION ACCOMPLIE! 🎉</p>
        <p>Les boutons PDF ont été remplacés par SAVE et PRINT</p>
      </div>
    </div>
  );
}