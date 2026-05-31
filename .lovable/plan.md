## Objectif

Distinguer dans **Présence** deux populations avec des règles différentes :
- **Employés standard** : 8h–16h, lundi–vendredi (règles actuelles inchangées).
- **Enseignants** : 2 à 6 heures/semaine réparties sur des créneaux programmés. Détection automatique : un profil ayant au moins un créneau actif dans la programmation enseignant est traité comme enseignant.

---

## 1. Base de données

Nouvelle table `teacher_schedule_slots` :
- `organization_id`, `profile_id`
- `day_of_week` (0–6)
- `start_time`, `end_time` (time)
- `subject` (texte libre, optionnel — matière/classe)
- `valid_from`, `valid_to` (dates, période de validité; `valid_to` nullable = en cours)
- `is_active` (bool)
- timestamps + GRANTs + RLS (HR gère, employé voit ses propres créneaux)

Vue (ou requête helper) `teacher_profiles` : `profile_id` distincts ayant au moins un slot actif sur la semaine en cours → sert à la détection auto.

## 2. UI — nouveau module "Programmation enseignants"

Page `/teacher-schedules` (RH/Admin uniquement) :
- Liste des enseignants programmés avec total heures/semaine
- Bouton "Programmer un enseignant" → sélection profil + ajout de N créneaux (jour, heure début/fin, matière)
- Édition/suppression de créneaux, activation/désactivation
- Indicateur visuel si total semaine ≠ 6h (info, pas bloquant — 2h/4h/6h tous valides)

Lien dans la navigation (zone RH).

## 3. Page Présence — sections empilées

Restructure `Attendance.tsx` (et dashboard temps réel) en deux sections successives :

### Section A — Employés (existant)
Stats actuelles, filtres, liste — inchangé, mais filtré pour exclure les profils détectés enseignants.

### Section B — Enseignants
- **Par créneau aujourd'hui** : pour chaque enseignant programmé aujourd'hui, afficher ses créneaux du jour + statut (pointé / en attente / manqué selon l'heure courante et l'historique `attendance`).
- **Cumul semaine en cours** : tableau `enseignant | heures programmées | heures faites | %`. Heures faites = somme des durées de créneaux où un pointage existe le bon jour dans la fenêtre du créneau (tolérance ±15 min configurable plus tard).
- Pas de "retard" si l'enseignant n'est pas programmé ce jour.

## 4. Logique de pointage

Côté `ScanCentralQR` / pointage manuel : si profil est enseignant, on enregistre quand même la ligne `attendance` mais le statut "retard" n'est calculé que par rapport au créneau du jour (début > heure créneau + seuil) ; sinon "present". Si aucun créneau ce jour → statut "hors_programme" (présence enregistrée mais non comptée comme retard ni absence).

## 5. Rapports

Ajout dans rapport mensuel d'une sous-section "Enseignants" : heures programmées vs réalisées par enseignant et par semaine.

---

## Détails techniques

- Migration Supabase : CREATE TABLE + GRANTs (`anon` exclu, `authenticated` CRUD, `service_role` ALL) + RLS (HR manage via `has_admin_role`, enseignant SELECT ses propres slots) + index `(organization_id, profile_id, day_of_week)`.
- Hook `useTeacherSchedules(profileId?)` côté front, similaire à `useSpecialSchedules`.
- Helper `isTeacherProfile(profileId)` basé sur la présence d'au moins un slot actif (vue ou requête mise en cache via React Query).
- Composant `TeacherAttendanceSection` mont
é sous le dashboard existant, isolé pour ne pas casser l'expérience employés.
- Ajout entrée navigation RH "Programmation enseignants" et mise à jour mémoire (`mem://features/hr/teacher-scheduling`).

---

## Ce qui reste pour plus tard (hors scope ce PR)

- Notifications email "créneau manqué"
- Auto-génération d'horaire à partir d'un template (cours récurrents)
- Validation/approbation des programmations par un directeur pédagogique
