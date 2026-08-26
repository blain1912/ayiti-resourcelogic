# Extension GRHPro — Ambassades, consulats et missions diplomatiques

Audit d'abord, puis extension progressive. Aucune table, route ou module existant n'est supprimé ou renommé.

---

## Phase 1 — Audit de l'existant

### Déjà en place et directement réutilisable

| Besoin exprimé | Existant dans GRHPro |
|---|---|
| Institution | Table `organizations` (nom, type, logo, couleurs, domaine, abonnement, seuil de retard, politique de congés) |
| Structures administratives multi-niveaux | Table `organizational_units` avec `parent_id` récursif + `UnitsList`, `UnitForm`, `OrganizationalUnits`, import/export Excel, validations de dépendances (`structureValidation.ts`) |
| Postes | Table `positions` (nom, catégorie, salaire) + `employee_categories` |
| Agents | Table `profiles` (rattachée à `organization_id`, `unit_id`, `position_id`) |
| Compte individuel / Mon espace | `EmployeeProfile.tsx` (profil, documents, postes & paie), `MyQRCode`, `Leaves`, `EmployeeSchedule` |
| Présence manuelle | `Attendance.tsx` + table `attendance` (statut, heure, `marked_by`, notes) |
| QR central | `CentralQRCode`, `CentralQRDisplay`, `ScanCentralQR`, `attendanceQr.ts` |
| QR individuel | `EmployeeQRCode`, `MyQRCode`, `QRScanner`, `ScanAttendance` |
| Horaires | `special_schedules`, `special_schedule_assignments`, `teacher_schedule_slots`, seuil de retard par organisation |
| Tableau de bord RH | `Dashboard`, `RealtimeAttendanceDashboard`, `UnitDashboard`, `useUnitDashboardStats` |
| Rapports & exports | `MonthlyReport`, `Reports` (10+ rapports), export PDF (`exportPdf.ts`) et Excel (`xlsx`) |
| Historique des affectations | Table `staff_movements` (ancienne/nouvelle structure, poste, catégorie, date d'effet, référence de décision) |
| Sécurité / isolation | RLS par `organization_id`, `user_roles` séparée, fonctions `has_role`, `has_admin_role`, `has_hr_access`, `is_super_admin` |
| Journal d'audit | `correspondence_audit_log` (limité à la correspondance) |

### Réellement manquant

1. Le type d'institution est un ENUM Postgres figé (`organization_type`: ministere, direction_generale, organisme_autonome, organisme_deconcentre) — pas d'ambassade/consulat, et non administrable.
2. Le type de structure est aussi un ENUM figé (`unit_type`) — pas de « cabinet », « section consulaire », etc.
3. `organizational_units` n'a ni code, ni responsable, ni description, ni statut actif, ni ordre d'affichage.
4. `positions` n'a ni code, ni structure de rattachement, ni niveau, ni supérieur hiérarchique, ni description/responsabilités, ni statut vacant/occupé.
5. Pas de vue organigramme (uniquement des listes/arbres).
6. Pas de paramétrage par institution des modes de pointage (manuel / QR central / QR individuel).
7. Pas de journal d'audit transversal (uniquement correspondance).
8. Pas de rattachement d'une institution à une autorité centrale (réseau diplomatique).
9. Le QR individuel encode `ATT-EMP:<profile_id>` — identifiant direct, à remplacer par un token révocable.

### Risques de régression identifiés

- Les ENUMs `organization_type` / `unit_type` sont utilisés dans les formulaires et les libellés : on **ajoute** des valeurs (`ALTER TYPE ... ADD VALUE`), on n'en supprime aucune.
- `positions.category_id` est NOT NULL : les nouveaux champs seront tous nullables avec valeurs par défaut.
- Les nouvelles colonnes n'entraînent aucun changement de RLS existante.
- `attendanceQr.ts` continue d'accepter l'ancien format `ATT-EMP:` en plus du nouveau format token (rétrocompatibilité).

---

## Phase 2 — Organisation (institution, structures, postes)

**Migration non destructive :**
- Ajout des valeurs `ambassade`, `consulat_general`, `consulat`, `mission_permanente`, `mission_diplomatique`, `institution_publique`, `autre` à `organization_type`.
- Ajout à `unit_type` : `cabinet`, `section`, `bureau`, `unite`, `autre` (les valeurs existantes restent).
- Nouvelle table `institution_type_labels` (par institution : libellés personnalisables — « Agent » vs « Employé », « Structure » vs « Direction »), administrable.
- `organizational_units` : + `code`, `description`, `manager_profile_id`, `is_active`, `display_order`.
- `positions` : + `code`, `unit_id`, `level`, `reports_to_position_id`, `description`, `responsibilities`, `is_vacant`, `status`, `notes`. `category_id` rendu nullable.
- `organizations` : + `parent_organization_id` (réseau diplomatique, nullable).

**UI :**
- `OrganizationInfo` : le type d'institution passe d'une liste figée à la liste étendue.
- `UnitForm` : nouveaux champs (code, responsable, description, actif, ordre).
- Nouvel onglet **Organigramme** dans la page Structures — arbre visuel récursif, exportable en PDF via l'utilitaire existant.
- Formulaire de poste étendu (code, structure, niveau, supérieur, vacant/occupé).

## Phase 3 — Mon espace

Regrouper l'existant (profil, présences, congés, documents, notifications) dans une page `Mon espace` à onglets qui **réutilise** les composants actuels — aucune duplication de logique.

## Phase 4 — Présences

- Table `attendance_settings` par institution : `manual_enabled`, `central_qr_enabled`, `individual_qr_enabled`, tolérance, heures normales, jours travaillés.
- Table `attendance_qr_tokens` : token opaque révocable par agent (le QR n'expose plus l'ID profil).
- Anti-double pointage : contrainte + vérification côté scan.
- Écran `Administration → Présences → Paramètres`.
- Table `work_holidays` (fériés et fermetures exceptionnelles) prise en compte dans les calculs d'absence.

## Phase 5 — Tableau de bord et rapports

- Bloc « Aujourd'hui » : total, présents, absents, retards, congés, missions, non pointés — chaque indicateur cliquable ouvre la liste des agents.
- Vue « Présence par structure » (X / Y présents par unité).
- Rapports journalier / hebdo / mensuel / par agent / structure / poste / période, avec export PDF et Excel via les utilitaires existants.

## Phase 6 — Réseau diplomatique et audit

- Table `audit_log` transversale (acteur, action, entité, ancienne/nouvelle valeur, date) + triggers sur `profiles`, `attendance`, `positions`, `organizational_units`, `user_roles`.
- Vue consolidée pour une autorité centrale via `parent_organization_id`, activée **uniquement** par un rôle explicite `autorite_centrale` — jamais par défaut.

---

## Détails techniques

- Toutes les migrations sont additives : `ADD COLUMN ... NULL`, `ALTER TYPE ... ADD VALUE`, `CREATE TABLE IF NOT EXISTS`. Aucun `DROP`.
- Chaque nouvelle table publique reçoit ses `GRANT` (authenticated CRUD, service_role ALL, pas d'anon) puis RLS scoping par `organization_id`.
- Les libellés dynamiques passent par un hook `useInstitutionLabels()` qui retombe sur les libellés actuels si aucune personnalisation — les écrans existants restent identiques par défaut.
- Vérification à chaque phase : build propre et non-régression des écrans Présence, Employés, Structures, Paie.

---

## Ordre de livraison proposé

Je livre phase par phase, en commençant par la **Phase 2 (Organisation)**, et je vérifie la non-régression avant de passer à la suivante.
