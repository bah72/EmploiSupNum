export const ALL_ROOMS = ["101", "102", "103", "201", "202", "203", "205", "301", "302", "303", "Amphi A", "Amphi B", "Khawarizmi", "Hamidoune", "Lab 1", "Lab 2", "Lab 3", "Lab 4", "Lab 5", "Lab 6", "Lab 7", "Salle Visio", "Atelier"];
export const MAIN_GROUPS = ["Groupe 1", "Groupe 2", "Groupe 3", "Groupe 4"];
export const DAYS = ['LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];
export const SEMESTERS = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

export const MASTER_DB = [
  {
    "semestre": "S1",
    "matieres": [
        { "code": "DEV110", "libelle": "Algo et programmation", "enseignants": "Cheikh/Sidi Med" },
        { "code": "DEV111", "libelle": "Bases de données 1", "enseignants": "Moussa" },
        { "code": "DEV112", "libelle": "Technologies web", "enseignants": "Sidi Med" },
        { "code": "SYR110", "libelle": "Bases informatiques", "enseignants": "Sass" },
        { "code": "SYR111", "libelle": "Concepts de Base de Réseaux", "enseignants": "Tourad" },
        { "code": "MAI110", "libelle": "Algèbre", "enseignants": "Habeb" },
        { "code": "MAI111", "libelle": "Analyse", "enseignants": "Habeb" },
        { "code": "MAI112", "libelle": "PIX 1", "enseignants": "Equipe" },
        { "code": "DPR110", "libelle": "Communication/Anglais", "enseignants": "Lam/Bouha" },
        { "code": "OME110", "libelle": "Intro. Économie Générale", "enseignants": "Hamadi" }
    ]
  },
  {
    "semestre": "S2",
    "matieres": [
      { "code": "DEV210", "libelle": "Prog. Python", "enseignants": "Hafedh" },
      { "code": "DEV211", "libelle": "Langages web", "enseignants": "SidiMed" },
      { "code": "SPE210", "libelle": "BD2(GI&G2)/CMS-PAOI /Syst. Réseaux", "enseignants": "Moussa/Haithem/Tourad" },
      { "code": "DSI210", "libelle": "SGBD I", "enseignants": "Moussa" },
      { "code": "RSS210", "libelle": "LAN", "enseignants": "Tourad" },
      { "code": "CNM210", "libelle": "CMS et PAOI", "enseignants": "Sidati" },
      { "code": "SYR210", "libelle": "Système logique", "enseignants": "Sass" },
      { "code": "SYR211", "libelle": "Systeme d'Exploitation I", "enseignants": "Meya" },
      { "code": "MAI210", "libelle": "Algèbre 2", "enseignants": "Habeb" },
      { "code": "MAI211", "libelle": "Proba. & statistiques", "enseignants": "S.Maouloud" },
      { "code": "MAI212", "libelle": "Certification PIX 2", "enseignants": "Aicha/Nagi/Lamine" },
      { "code": "DPR210", "libelle": "Communication", "enseignants": "Lam/Abdi/Saghir" },
      { "code": "DPR211", "libelle": "Anglais", "enseignants": "Bouha" }
    ]
  },
  {
    "semestre": "S3",
    "matieres": [
      { "code": "PAV310", "libelle": "POO JAVA", "enseignants": "Debagh" },
      { "code": "PAV311", "libelle": "SD & Comp. Algo", "enseignants": "Cheikh" },
      { "code": "DAS310", "libelle": "Machine learning", "enseignants": "Louly/Autres" },
      { "code": "DAS311", "libelle": "RO", "enseignants": "Meya" },
      { "code": "RSS321", "libelle": "BD & CSI", "enseignants": "Med Lemine" },
      { "code": "DPR310", "libelle": "Communication (GI,G2,G3)/Anglais(G4,G5,G6)", "enseignants": "Dieynaba/Blake" },
      { "code": "DPR311", "libelle": "Communication (G4,G5,G6)/Anglais(GI,G2,G3)", "enseignants": "Dieynaba/Blake" },
      { "code": "DPR313", "libelle": "Gestion d'entreprise (En ligne)", "enseignants": "Hamadi" },
      { "code": "DSI310", "libelle": "Génie logiciel", "enseignants": "Moussa" },
      { "code": "DSI311", "libelle": "Bases de données avancées", "enseignants": "Kaber" },
      { "code": "DSI320", "libelle": "Dev. Web avec Python", "enseignants": "Sidi Med" },
      { "code": "DSI321", "libelle": "DevOps", "enseignants": "Vatimetou" },
      { "code": "DSI330", "libelle": "Projet Intégrateur", "enseignants": "Encadreur" },
      { "code": "CNM310", "libelle": "Numérisation et codage", "enseignants": "El Bennany" },
      { "code": "RSS310", "libelle": "Réseaux Mobiles", "enseignants": "El Aoun" },
      { "code": "RSS320", "libelle": "Intro Sécurité info.", "enseignants": "Mohamed Said" }
    ]
  },
  {
    "semestre": "S4",
    "matieres": [
      { "code": "PAV411", "libelle": "J2E", "enseignants": "Yehdih" },
      { "code": "PAV412", "libelle": "Dév Mobile", "enseignants": "Salem/Lemine" },
      { "code": "DPR410", "libelle": "Communication", "enseignants": "Dieynaba" },
      { "code": "DPR411", "libelle": "Anglais", "enseignants": "Blake" },
      { "code": "DPR412", "libelle": "Droit informatique", "enseignants": "Mamadou Sow" },
      { "code": "DSI410", "libelle": "Réseaux avancés et sécu", "enseignants": "Biha/Said" },
      { "code": "DSI411", "libelle": "Bases de données NOSQL", "enseignants": "Moussa" },
      { "code": "CNM411", "libelle": "Infographie 2D/3D", "enseignants": "Nadra" },
      { "code": "RSS411", "libelle": "Voix et ToIP", "enseignants": "El Aoun" }
    ]
  },
  {
    "semestre": "S5",
    "matieres": [
      { "code": "BWC510", "libelle": "Archi SOA et Web services", "enseignants": "Sidi Mahmoud" },
      { "code": "BWC511", "libelle": "Big Data", "enseignants": "Sidi Mohamed RHIL" },
      { "code": "BWC512", "libelle": "Virtualisation et cloud", "enseignants": "Tourad" },
      { "code": "DPR510", "libelle": "Communication", "enseignants": "Dieynaba" },
      { "code": "DPR512", "libelle": "Entreprenariat", "enseignants": "Kébé" },
      { "code": "DSI520", "libelle": "Prep. Certif. Oracle", "enseignants": "Kaber" },
      { "code": "DSI510", "libelle": "J2E avancé", "enseignants": "Abderrahmane" },
      { "code": "DSI511", "libelle": "Projet fin cursus", "enseignants": "Encadrants" },
      { "code": "RSS520", "libelle": "Prep. Certif. CCNA", "enseignants": "Sow" }
    ]
  }
];
