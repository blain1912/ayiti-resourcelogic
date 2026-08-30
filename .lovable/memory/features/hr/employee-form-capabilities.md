---
name: Fiche agent adaptative par capacités
description: Affichage contextuel des champs de la fiche agent selon la famille d'organisation (code budgétaire, aussi professeur, niveau d'études)
type: feature
---

`src/lib/organizationCapabilities.ts` centralise les règles d'affichage de la fiche agent
(`getOrganizationCapabilities(type, overrides)`), consommées via `useOrganizationCapabilities()`.

Capacités : `supports_budget_code`, `supports_teaching_role`, `supports_education_fields`,
`supports_diplomatic_assignment`, `supports_multiple_assignments`, `entry_date_label`.

Règles :
- Famille diplomatique (ambassade, consulat_general, consulat, mission_permanente, mission_diplomatique) :
  pas de « Code budgétaire », pas de « Aussi professeur (cumul de poste) », libellé « Date de prise de poste ».
- « Niveau d'études » n'est plus dans le bloc « Informations professionnelles » : section « Formation et qualifications ».
- Aucune colonne ni donnée n'est supprimée : les champs masqués restent en base et réactivables via `overrides`.
- Le cumul de postes générique (`staff_assignments`) reste actif pour toutes les organisations ;
  « Aussi professeur » est uniquement le cas particulier enseignement.
- Le code budgétaire n'est requis (validation Zod) que si `supports_budget_code`.
