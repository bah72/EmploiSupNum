"use client";

import React from 'react';

export default function SimplePage() {
  const handleSave = () => {
    alert('BOUTON SAUVEGARDER CLIQUÉ!');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTest = () => {
    alert('BOUTON TEST FONCTIONNE!');
  };

  return (
    <div className="h-screen bg-red-500 text-white p-8">
      <h1 className="text-6xl font-bold text-center mb-8">🔴 BOUTONS TEST 🔴</h1>
      
      <div className="flex justify-center gap-8 mb-8">
        <button 
          onClick={handleSave} 
          className="bg-green-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg hover:bg-green-700"
        >
          💾 SAUVEGARDER
        </button>
        
        <button 
          onClick={handlePrint} 
          className="bg-blue-600 text-white px-8 py-4 rounded-lg text-2xl font-bold shadow-lg hover:bg-blue-700"
        >
          🖨️ IMPRIMER
        </button>
        
        <button 
          onClick={handleTest} 
          className="bg-yellow-600 text-black px-8 py-4 rounded-lg text-2xl font-bold shadow-lg hover:bg-yellow-700"
        >
          ⚠️ TEST
        </button>
      </div>
      
      <div className="text-center text-2xl">
        <p>✅ Si vous voyez cette page, React fonctionne</p>
        <p>✅ Les boutons SAVE et PRINT sont maintenant visibles</p>
        <p>✅ Cliquez sur TEST pour vérifier</p>
      </div>
    </div>
  );
}