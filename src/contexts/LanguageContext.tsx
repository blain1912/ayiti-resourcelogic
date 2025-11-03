import React, { createContext, useContext, useState, useEffect } from 'react';

type Language = 'fr' | 'ht';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    // Navigation
    dashboard: "Tableau de bord",
    employees: "Employés",
    leaves: "Congés",
    documents: "Documents",
    settings: "Paramètres",
    
    // Dashboard
    welcomeTitle: "Bienvenue dans le Système de GRH",
    welcomeSubtitle: "Gérez efficacement les ressources humaines de votre administration",
    totalEmployees: "Total Employés",
    activeLeaves: "Congés Actifs",
    pendingRequests: "Demandes en Attente",
    departments: "Départements",
    
    // Employees
    employeeList: "Liste des Employés",
    addEmployee: "Ajouter Employé",
    name: "Nom",
    position: "Poste",
    department: "Département",
    status: "Statut",
    actions: "Actions",
    
    // Leaves
    leaveRequests: "Demandes de Congés",
    requestLeave: "Demander Congé",
    startDate: "Date de Début",
    endDate: "Date de Fin",
    type: "Type",
    reason: "Raison",
    
    // Documents
    documentManagement: "Gestion des Documents",
    uploadDocument: "Téléverser Document",
    fileName: "Nom du Fichier",
    uploadDate: "Date de Téléversement",
    category: "Catégorie",
    
    // Common
    search: "Rechercher",
    filter: "Filtrer",
    export: "Exporter",
    save: "Enregistrer",
    cancel: "Annuler",
    edit: "Modifier",
    delete: "Supprimer",
    view: "Voir",
    active: "Actif",
    inactive: "Inactif",
  },
  ht: {
    // Navigation
    dashboard: "Tablo Bò",
    employees: "Anplwaye",
    leaves: "Konje",
    documents: "Dokiman",
    settings: "Paramèt",
    
    // Dashboard
    welcomeTitle: "Byenveni nan Sistèm GRH",
    welcomeSubtitle: "Jere efikasman resous imen administrasyon w",
    totalEmployees: "Total Anplwaye",
    activeLeaves: "Konje Aktif",
    pendingRequests: "Demann k ap Tann",
    departments: "Depatman",
    
    // Employees
    employeeList: "Lis Anplwaye",
    addEmployee: "Ajoute Anplwaye",
    name: "Non",
    position: "Pozisyon",
    department: "Depatman",
    status: "Estati",
    actions: "Aksyon",
    
    // Leaves
    leaveRequests: "Demann Konje",
    requestLeave: "Mande Konje",
    startDate: "Dat Kòmansman",
    endDate: "Dat Finisman",
    type: "Kalite",
    reason: "Rezon",
    
    // Documents
    documentManagement: "Jesyon Dokiman",
    uploadDocument: "Telechaje Dokiman",
    fileName: "Non Fichye",
    uploadDate: "Dat Telechajman",
    category: "Kategori",
    
    // Common
    search: "Chèche",
    filter: "Filtre",
    export: "Ekspoте",
    save: "Anrejistre",
    cancel: "Anile",
    edit: "Modifye",
    delete: "Efase",
    view: "Gade",
    active: "Aktif",
    inactive: "Inaktif",
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('language');
    return (saved as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.fr] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
