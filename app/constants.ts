export const ALL_ROOMS = ["101", "102", "103", "201", "202", "203", "205", "301", "302", "303", "Khawarizmi", "Hamidoune", "Lab 1", "Lab 2", "Lab 3", "Lab 4", "Lab 5", "Lab 6", "Lab 7", "Salle Visio", "Atelier"];
export const MAIN_GROUPS = ["Groupe 1", "Groupe 2", "Groupe 3", "Groupe 4"];
export const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM', 'DIM'];
export const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

// Utilisateurs par défaut - SUPPRIMÉ pour utiliser Supabase
// export const DEFAULT_USERS = [
//   {
//     id: "1",
//     username: "moussa.ba@supnum.mr",
//     password: "12345678",
//     role: "admin" as const,
//     name: "Moussa Ba (Admin)"
//   },
//   {
//     id: "2",
//     username: "prof@supnum.mr",
//     password: "12345678",
//     role: "prof" as const,
//     name: "Professeur"
//   },
//   {
//     id: "3",
//     username: "student@supnum.mr",
//     password: "12345678",
//     role: "student" as const,
//     name: "Étudiant"
//   }
// ];

export const MASTER_DB = [
  {
    "semestre": "S1",
    "matieres": [
      { "code": "DEV110", "libelle": "Algo et prog.", "enseignants": "Cheikh/Sidi Med", "credit": 6 },
      { "code": "DEV111", "libelle": "B. de données 1", "enseignants": "Moussa", "credit": 4 },
      { "code": "DEV112", "libelle": "Tech. web", "enseignants": "Sidi Med", "credit": 4 },
      { "code": "SYR110", "libelle": "Bases info.", "enseignants": "Sass", "credit": 3 },
      { "code": "SYR111", "libelle": "C.B. de Réseaux", "enseignants": "Tourad", "credit": 3 },
      { "code": "MAI110", "libelle": "Algèbre", "enseignants": "Habeb", "credit": 4 },
      { "code": "MAI111", "libelle": "Analyse", "enseignants": "Habeb", "credit": 4 },
      { "code": "MAI112", "libelle": "PIX 1", "enseignants": "Equipe", "credit": 2 },
      { "code": "DPR110", "libelle": "Communication", "enseignants": "Djeinaba", "credit": 3 },
      { "code": "DPR111", "libelle": "Alglais", "enseignants": "Blake", "credit": 3 },
      { "code": "DPR1012", "libelle": "PPP1", "enseignants": "Soueina", "credit": 1 },
      { "code": "OME110", "libelle": "Intro. Économie Gén.", "enseignants": "Sadvi", "credit": 2 },
      { "code": "OME110", "libelle": "Proba. & Statistique", "enseignants": "Bakar", "credit": 2 }
    ]
  },
  {
    "semestre": "S2",
    "matieres": [
      { "code": "DEV210", "libelle": "Prog. Python", "enseignants": "Hafedh", "credit": 5 },
      { "code": "DEV211", "libelle": "Langages web", "enseignants": "SidiMed", "credit": 4 },
      { "code": "SPE210", "libelle": "BD2/CMS-PAOI /Syst. Réseaux", "enseignants": "Moussa/Haithem/Tourad", "credit": 6 },
      { "code": "DSI210", "libelle": "SGBD I", "enseignants": "Moussa", "credit": 4 },
      { "code": "RSS210", "libelle": "LAN", "enseignants": "Tourad", "credit": 3 },
      { "code": "CNM210", "libelle": "CMS et PAOI", "enseignants": "Sidati", "credit": 3 },
      { "code": "SYR210", "libelle": "Système logique", "enseignants": "Sass", "credit": 3 },
      { "code": "SYR211", "libelle": "Systeme d'Exploitation I", "enseignants": "Meya", "credit": 4 },
      { "code": "MAI210", "libelle": "Algèbre 2", "enseignants": "Habeb", "credit": 3 },
      { "code": "MAI211", "libelle": "Proba. & statistiques", "enseignants": "Bakar", "credit": 3 },
      { "code": "MAI212", "libelle": "Certification PIX 2", "enseignants": "Aicha/Nagi/Lamine", "credit": 2 },
      { "code": "DPR210", "libelle": "Communication", "enseignants": "Lam/Abdi/Saghir", "credit": 2 },
      { "code": "DPR211", "libelle": "Anglais", "enseignants": "Bouha", "credit": 4 },
      { "code": "ATE210", "libelle": "Composants Electroniques", "enseignants": "Senad", "credit": 2 },
      { "code": "MAE210", "libelle": "Macro et Microeconomie", "enseignants": "xxx", "credit": 3 },
      { "code": "MAE211", "libelle": "Statistiques 2", "enseignants": "Bakar", "credit": 2 },
      { "code": "MAE212", "libelle": "Statistiques Descriptives", "enseignants": "Bakar", "credit": 2 },
      { "code": "MAE213", "libelle": "Certification PIX 1", "enseignants": "Yahjebouha", "credit": 2 }
    ]
  },
  {
    "semestre": "S3",
    "matieres": [
      { "code": "PAV310", "libelle": "POO JAVA", "enseignants": "Debagh", "credit": 5 },
      { "code": "PAV311", "libelle": "SD & Comp. Algo", "enseignants": "Cheikh", "credit": 4 },
      { "code": "DAS310", "libelle": "Machine learning", "enseignants": "Louly/Autres", "credit": 4 },
      { "code": "DAS311", "libelle": "RO", "enseignants": "Meya", "credit": 3 },
      { "code": "RSS321", "libelle": "BD & CSI", "enseignants": "Med Lemine", "credit": 4 },
      { "code": "DPR310", "libelle": "Communication (GI,G2,G3)/Anglais(G4,G5,G6)", "enseignants": "Dieynaba/Blake", "credit": 2 },
      { "code": "DPR311", "libelle": "Communication (G4,G5,G6)/Anglais(GI,G2,G3)", "enseignants": "Dieynaba/Blake", "credit": 2 },
      { "code": "DPR313", "libelle": "Gestion d'entreprise (En ligne)", "enseignants": "Hamadi", "credit": 2 },
      { "code": "DSI310", "libelle": "Génie logiciel", "enseignants": "Moussa", "credit": 4 },
      { "code": "DSI311", "libelle": "Bases de données avancées", "enseignants": "Kaber", "credit": 4 },
      { "code": "DSI320", "libelle": "Dev. Web avec Python", "enseignants": "Sidi Med", "credit": 5 },
      { "code": "DSI321", "libelle": "DevOps", "enseignants": "Vatimetou", "credit": 3 },
      { "code": "DSI330", "libelle": "Projet Intégrateur", "enseignants": "Encadreur", "credit": 6 },
      { "code": "CNM310", "libelle": "Numérisation et codage", "enseignants": "El Bennany", "credit": 3 },
      { "code": "RSS310", "libelle": "Réseaux Mobiles", "enseignants": "El Aoun", "credit": 3 },
      { "code": "RSS320", "libelle": "Intro Sécurité info.", "enseignants": "Mohamed Said", "credit": 3 }
    ]
  },
  {
    "semestre": "S4",
    "matieres": [
      { "code": "PAV411", "libelle": "J2E", "enseignants": "Yehdih", "credit": 5 },
      { "code": "PAV412", "libelle": "Dév Mobile", "enseignants": "Salem/Lemine", "credit": 4 },
      { "code": "DPR410", "libelle": "Communication", "enseignants": "Dieynaba", "credit": 2 },
      { "code": "DPR411", "libelle": "Anglais", "enseignants": "Blake", "credit": 2 },
      { "code": "DPR412", "libelle": "Droit informatique", "enseignants": "Mamadou Sow", "credit": 2 },
      { "code": "DSI410", "libelle": "Réseaux avancés et sécu", "enseignants": "Biha/Said", "credit": 4 },
      { "code": "DSI411", "libelle": "Bases de données NOSQL", "enseignants": "Moussa", "credit": 3 },
      { "code": "CNM411", "libelle": "Infographie 2D/3D", "enseignants": "Nadra", "credit": 4 },
      { "code": "RSS411", "libelle": "Voix et ToIP", "enseignants": "El Aoun", "credit": 3 }
    ]
  },
  {
    "semestre": "S5",
    "matieres": [
      { "code": "BWC510", "libelle": "A. SOA et Web services", "enseignants": "Sidi Mahmoud", "credit": 4 },
      { "code": "BWC511", "libelle": "Big Data", "enseignants": "Sidi Mohamed RHIL", "credit": 5 },
      { "code": "BWC512", "libelle": "Virtualisation et cloud", "enseignants": "Tourad", "credit": 4 },
      { "code": "DPR510", "libelle": "Communication", "enseignants": "Dieynaba", "credit": 2 },
      { "code": "DPR512", "libelle": "Entreprenariat", "enseignants": "Kébé", "credit": 2 },
      { "code": "DSI520", "libelle": "Prep. Certif. Oracle", "enseignants": "Kaber", "credit": 3 },
      { "code": "DSI510", "libelle": "J2E avancé", "enseignants": "Abderrahmane", "credit": 5 },
      { "code": "DSI511", "libelle": "Projet fin cursus", "enseignants": "Encadrants", "credit": 8 },
      { "code": "RSS520", "libelle": "Prep. Certif. CCNA", "enseignants": "Sow", "credit": 3 }
    ]
  }
];
