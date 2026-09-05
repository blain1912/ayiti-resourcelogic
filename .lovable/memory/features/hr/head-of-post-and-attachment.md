---
name: Chef de poste et rattachement des représentations
description: Responsable d'une représentation diplomatique/consulaire (head_profile_id) et rattachement institutionnel non destructif (parent_organization_id)
type: feature
---

- « Chef de poste » n'est **jamais** un poste ni un rôle applicatif : c'est une
  valeur du champ libre `profiles.fonction_responsabilite`, proposée par
  `src/lib/responsibilities.ts` (suggestions via `<datalist>`, liste extensible).
- `organizations.head_profile_id` : agent responsable de la représentation.
  Trigger `validate_organization_head` — l'agent doit appartenir à la même organisation,
  et une organisation ne peut pas se rattacher à elle-même. Aucun droit d'accès associé.
- `organizations.parent_organization_id` : lien de coordination uniquement.
  Aucune RLS ne s'appuie dessus ; chaque représentation garde structures, agents,
  présences, congés et documents cloisonnés.
- RPC `list_attachable_representations(_organization_id)` : liste des organisations
  approuvées rattachables, réservée aux admins de l'organisation et super admins.
- Capacités `supports_head_of_post` / `supports_parent_organization` : actives
  uniquement pour la famille diplomatique ; les organisations classiques sont inchangées.
- UI : `src/components/settings/OrganizationDetails.tsx` (deux listes déroulantes).
