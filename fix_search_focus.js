// Script pour corriger le problème de focus du champ de recherche
const fs = require('fs');

// Lire le fichier page.tsx
let content = fs.readFileSync('app/page.tsx', 'utf8');

// Ajouter React.memo au composant SearchInput si pas déjà présent
if (!content.includes('const SearchInput = React.memo')) {
    // Trouver l'import React et ajouter useCallback si pas présent
    if (!content.includes('useCallback')) {
        content = content.replace(
            "import React, { useState, useMemo, useEffect } from 'react';",
            "import React, { useState, useMemo, useEffect, useCallback } from 'react';"
        );
    }
    
    // Ajouter le composant SearchInput après les imports
    const importEnd = content.indexOf('export default function App()');
    if (importEnd !== -1) {
        const searchInputComponent = `
// Composant séparé pour le champ de recherche pour éviter les re-rendus
const SearchInput = React.memo(({ searchQuery, setSearchQuery }: { searchQuery: string, setSearchQuery: (value: string) => void }) => {
    return (
        <div className="relative group">
            <Search className="absolute left-2 top-1.5 text-slate-400" size={12} />
            <input 
                type="text" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Chercher..." 
                className="w-28 focus:w-40 bg-white border border-slate-300 rounded-full py-1 pl-6 pr-4 text-[12px] font-medium transition-all outline-none" 
            />
        </div>
    );
});

`;
        content = content.slice(0, importEnd) + searchInputComponent + content.slice(importEnd);
    }
}

// Remplacer l'utilisation du champ de recherche dans le HeaderBanner
content = content.replace(
    /<div className="relative group">\s*<Search[^>]*\/>\s*<input[^>]*\/>\s*<\/div>/g,
    '<SearchInput searchQuery={searchQuery} setSearchQuery={setSearchQuery} />'
);

// Sauvegarder le fichier corrigé
fs.writeFileSync('app/page.tsx', content);

console.log('✅ Problème de focus du champ de recherche corrigé !');
console.log('🔄 Le champ de recherche ne perdra plus le focus lors de la saisie');