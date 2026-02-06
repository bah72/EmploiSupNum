// Utilitaire de nettoyage des données utilisateur invalides

export function cleanupInvalidUserData(): void {
  if (typeof window === 'undefined') return;

  try {
    // Nettoyer les anciennes données utilisateur
    const savedUser = localStorage.getItem('supnum_user');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      
      // Si l'utilisateur n'a pas d'email @supnum.mr, le supprimer
      if (!user.email || !user.email.endsWith('@supnum.mr')) {
        console.log('Nettoyage: suppression d\'un utilisateur invalide');
        localStorage.removeItem('supnum_user');
      }
    }

    // Nettoyer les autres données potentiellement invalides
    const keysToCheck = ['supnum_config', 'supnum_data'];
    keysToCheck.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        try {
          JSON.parse(data);
        } catch (e) {
          console.log(`Nettoyage: suppression de données corrompues pour ${key}`);
          localStorage.removeItem(key);
        }
      }
    });

  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
  }
}

// Validation renforcée de l'email
export function isValidSupnumEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@supnum\.mr$/;
  return emailRegex.test(email);
}

// Fonction pour forcer la déconnexion si l'utilisateur est invalide
export function forceLogoutIfInvalid(setCurrentUser: (user: null) => void): void {
  if (typeof window === 'undefined') return;

  const savedUser = localStorage.getItem('supnum_user');
  if (savedUser) {
    try {
      const user = JSON.parse(savedUser);
      if (!isValidSupnumEmail(user.email)) {
        console.log('Déconnexion forcée: utilisateur invalide détecté');
        localStorage.removeItem('supnum_user');
        setCurrentUser(null);
      }
    } catch (e) {
      console.log('Déconnexion forcée: données utilisateur corrompues');
      localStorage.removeItem('supnum_user');
      setCurrentUser(null);
    }
  }
}
