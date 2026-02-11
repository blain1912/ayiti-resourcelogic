import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, BookOpen, Users, QrCode, Calendar, Settings, Shield, Building, FileText, Mail, Briefcase, Star, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserManual = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-8 px-4 print:bg-white print:text-black">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4 print:hidden">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-primary-foreground hover:bg-primary-foreground/20">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={handlePrint} className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/20">
              <Download className="h-4 w-4 mr-2" />
              Imprimer / Télécharger PDF
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <BookOpen className="h-10 w-10" />
            <div>
              <h1 className="text-3xl font-bold">Manuel d'Utilisation</h1>
              <p className="text-primary-foreground/80">Système de Gestion des Ressources Humaines</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-8 px-4 max-w-4xl">
        {/* Table des matières */}
        <Card className="mb-8 print:shadow-none print:border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Table des Matières
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
              <li><a href="#introduction" className="hover:text-primary">Introduction</a></li>
              <li><a href="#connexion" className="hover:text-primary">Connexion et Inscription</a></li>
              <li><a href="#dashboard" className="hover:text-primary">Tableau de Bord</a></li>
              <li><a href="#employes" className="hover:text-primary">Gestion des Employés</a></li>
              <li><a href="#presence" className="hover:text-primary">Gestion des Présences</a></li>
              <li><a href="#conges" className="hover:text-primary">Gestion des Congés</a></li>
              <li><a href="#correspondance" className="hover:text-primary">Correspondance Administrative</a></li>
              <li><a href="#recrutement" className="hover:text-primary">Recrutement</a></li>
              <li><a href="#evaluations" className="hover:text-primary">Évaluations</a></li>
              <li><a href="#cartes-voeux" className="hover:text-primary">Cartes de Vœux</a></li>
              <li><a href="#badges" className="hover:text-primary">Badges Employés</a></li>
              <li><a href="#horaires" className="hover:text-primary">Horaires Spéciaux</a></li>
              <li><a href="#roles" className="hover:text-primary">Gestion des Rôles</a></li>
              <li><a href="#parametres" className="hover:text-primary">Paramètres</a></li>
              <li><a href="#super-admin" className="hover:text-primary">Administration Plateforme</a></li>
            </ol>
          </CardContent>
        </Card>

        {/* Sections */}
        <div className="space-y-8">
          {/* Introduction */}
          <section id="introduction">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  1. Introduction
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm max-w-none">
                <p>
                  Bienvenue dans le Système de Gestion des Ressources Humaines. Cette application vous permet de gérer efficacement :
                </p>
                <ul className="list-disc list-inside space-y-1 mt-4">
                  <li>Les profils des employés</li>
                  <li>Le suivi des présences via QR Code</li>
                  <li>La gestion des congés</li>
                  <li>La correspondance administrative (lettres, décisions, notes)</li>
                  <li>Le recrutement interne et externe</li>
                  <li>Les évaluations de performance</li>
                  <li>Les cartes de vœux automatisées</li>
                  <li>Les badges d'identification</li>
                  <li>Les horaires spéciaux</li>
                  <li>La structure organisationnelle</li>
                  <li>Les rôles et permissions</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Connexion */}
          <section id="connexion">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  2. Connexion et Inscription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="inscription">
                    <AccordionTrigger>Comment s'inscrire ?</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Accédez à la page d'inscription via le domaine de votre organisation</li>
                        <li>Remplissez le formulaire avec votre nom complet, email et mot de passe</li>
                        <li>Cliquez sur "S'inscrire"</li>
                        <li>Attendez l'approbation de votre administrateur RH</li>
                        <li>Une fois approuvé, vous recevrez un email de confirmation</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="connexion">
                    <AccordionTrigger>Comment se connecter ?</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Accédez à la page de connexion</li>
                        <li>Entrez votre adresse email</li>
                        <li>Entrez votre mot de passe</li>
                        <li>Cliquez sur "Se connecter"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="mot-de-passe">
                    <AccordionTrigger>Mot de passe oublié ?</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur "Mot de passe oublié" sur la page de connexion</li>
                        <li>Entrez votre adresse email</li>
                        <li>Vérifiez votre boîte email</li>
                        <li>Cliquez sur le lien de réinitialisation</li>
                        <li>Créez un nouveau mot de passe</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Dashboard */}
          <section id="dashboard">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  3. Tableau de Bord
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Le tableau de bord affiche un aperçu des statistiques clés :</p>
                <ul className="list-disc list-inside space-y-2">
                  <li><strong>Total Employés</strong> : Nombre total d'employés dans l'organisation</li>
                  <li><strong>Présents Aujourd'hui</strong> : Nombre d'employés présents</li>
                  <li><strong>Absents</strong> : Nombre d'employés absents</li>
                  <li><strong>En Congé</strong> : Nombre d'employés en congé</li>
                  <li><strong>Taux de Présence</strong> : Pourcentage de présence du jour</li>
                  <li><strong>Graphique Mensuel</strong> : Tendance des présences sur le mois</li>
                  <li><strong>Anniversaires</strong> : Widget des prochains anniversaires</li>
                  <li><strong>Profils Incomplets</strong> : Employés avec des informations manquantes</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          {/* Employés */}
          <section id="employes">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  4. Gestion des Employés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="liste">
                    <AccordionTrigger>Consulter la liste des employés</AccordionTrigger>
                    <AccordionContent>
                      <p>Menu <strong>Employés</strong> → Affiche la liste complète avec :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Photo et nom</li>
                        <li>Poste occupé</li>
                        <li>Direction/Service</li>
                        <li>Statut (Actif, En congé, etc.)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="profil">
                    <AccordionTrigger>Modifier un profil employé</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur l'employé dans la liste</li>
                        <li>Modifiez les informations souhaitées :
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Informations personnelles (nom, prénom, date de naissance)</li>
                            <li>Coordonnées (téléphone, email, adresse)</li>
                            <li>Informations professionnelles (poste, direction, date d'entrée)</li>
                            <li>Contact d'urgence</li>
                          </ul>
                        </li>
                        <li>Cliquez sur "Enregistrer"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="documents">
                    <AccordionTrigger>Documents employé</AccordionTrigger>
                    <AccordionContent>
                      <p>Chaque employé dispose d'un espace de stockage de documents :</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Accédez au profil de l'employé</li>
                        <li>Onglet <strong>Documents</strong></li>
                        <li>Téléversez des documents (contrat, diplômes, pièces d'identité)</li>
                        <li>Les documents sont classés par type</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="photo">
                    <AccordionTrigger>Ajouter une photo de profil</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Accédez au profil de l'employé</li>
                        <li>Cliquez sur la zone de photo</li>
                        <li>Sélectionnez une image (JPG, PNG)</li>
                        <li>La photo sera automatiquement redimensionnée</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Présence */}
          <section id="presence">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-primary" />
                  5. Gestion des Présences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="qr-scan">
                    <AccordionTrigger>Scanner un QR Code</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>RH</strong> → <strong>Présence</strong></li>
                        <li>Cliquez sur "Scanner QR Code"</li>
                        <li>Autorisez l'accès à la caméra</li>
                        <li>Positionnez le QR Code de l'employé devant la caméra</li>
                        <li>La présence est automatiquement enregistrée</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="qr-central">
                    <AccordionTrigger>QR Code central</AccordionTrigger>
                    <AccordionContent>
                      <p>Le QR Code central permet aux employés de pointer eux-mêmes :</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Un administrateur affiche le QR central sur un écran</li>
                        <li>Les employés scannent ce code avec leur téléphone</li>
                        <li>Leur présence est automatiquement enregistrée</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="manuel">
                    <AccordionTrigger>Marquer une présence manuellement</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Sélectionnez l'employé dans la liste</li>
                        <li>Cliquez sur "Présent" ou "Absent"</li>
                        <li>Ou utilisez le menu déroulant pour plus d'options :
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Présent</li>
                            <li>Absent</li>
                            <li>En retard</li>
                            <li>En congé</li>
                            <li>Malade</li>
                            <li>Permission</li>
                          </ul>
                        </li>
                        <li>Ajoutez une note si nécessaire</li>
                        <li>Cliquez sur "Enregistrer"</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="rapport">
                    <AccordionTrigger>Rapports mensuels</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>RH</strong> → <strong>Rapport Mensuel</strong></li>
                        <li>Sélectionnez le mois et l'année</li>
                        <li>Consultez le rapport détaillé par employé</li>
                        <li>Exportez le rapport en PDF</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="mon-qr">
                    <AccordionTrigger>Obtenir mon QR Code</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Cliquez sur votre photo de profil en haut à droite</li>
                        <li>Sélectionnez "Mon QR Code"</li>
                        <li>Téléchargez ou imprimez votre QR Code personnel</li>
                        <li>Présentez ce code lors de vos pointages</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Congés */}
          <section id="conges">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  6. Gestion des Congés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="demande">
                    <AccordionTrigger>Faire une demande de congé</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>RH</strong> → <strong>Congés</strong></li>
                        <li>Cliquez sur "Nouvelle demande"</li>
                        <li>Sélectionnez le type de congé :
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li>Congé annuel</li>
                            <li>Congé maladie</li>
                            <li>Congé maternité</li>
                            <li>Congé d'études</li>
                          </ul>
                        </li>
                        <li>Indiquez les dates de début et fin</li>
                        <li>Ajoutez un motif (optionnel)</li>
                        <li>Soumettez la demande</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="suivi">
                    <AccordionTrigger>Suivre mes demandes</AccordionTrigger>
                    <AccordionContent>
                      <p>Consultez l'état de vos demandes :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><span className="text-yellow-600">En attente</span> : Demande soumise</li>
                        <li><span className="text-green-600">Approuvée</span> : Congé accordé</li>
                        <li><span className="text-red-600">Refusée</span> : Demande rejetée</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="solde">
                    <AccordionTrigger>Consulter mon solde de congés</AccordionTrigger>
                    <AccordionContent>
                      <p>Le solde de congés affiche pour chaque type :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Jours totaux alloués pour l'année</li>
                        <li>Jours utilisés</li>
                        <li>Jours restants</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Correspondance */}
          <section id="correspondance">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  7. Correspondance Administrative
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Le module de correspondance permet de créer, valider et archiver des documents administratifs officiels.</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="modeles">
                    <AccordionTrigger>Modèles de documents</AccordionTrigger>
                    <AccordionContent>
                      <p>Créez des modèles réutilisables avec des variables dynamiques :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Types</strong> : Lettre, Décision, Note de service, Attestation, Certificat</li>
                        <li><strong>Catégories</strong> : Recrutement, Discipline, Carrière, Avantages, etc.</li>
                        <li><strong>Variables</strong> : <code className="bg-muted px-1 rounded">{"{{nom}}"}</code>, <code className="bg-muted px-1 rounded">{"{{matricule}}"}</code>, <code className="bg-muted px-1 rounded">{"{{poste}}"}</code>, etc.</li>
                      </ul>
                      <p className="mt-2">Les variables sont automatiquement remplacées par les données de l'employé concerné.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="creation">
                    <AccordionTrigger>Créer un courrier</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>Admin</strong> → <strong>Correspondance</strong></li>
                        <li>Onglet <strong>Courriers</strong> → Cliquez sur "Nouveau courrier"</li>
                        <li>Sélectionnez un modèle ou rédigez librement</li>
                        <li>Choisissez le destinataire (employé)</li>
                        <li>Le contenu est pré-rempli avec les données de l'employé</li>
                        <li>Modifiez si nécessaire puis enregistrez</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="numerotation">
                    <AccordionTrigger>Numérotation automatique</AccordionTrigger>
                    <AccordionContent>
                      <p>Chaque courrier reçoit automatiquement une référence unique au format :</p>
                      <div className="bg-muted p-3 rounded-lg mt-2 font-mono text-sm">
                        RH/CATÉGORIE/CODE_ORG/ANNÉE/SÉQUENCE
                      </div>
                      <p className="mt-2">Exemples :</p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li><code className="bg-muted px-1 rounded">RH/AV/2026/0045</code></li>
                        <li><code className="bg-muted px-1 rounded">RH/BL/INST01/2026/0021</code></li>
                      </ul>
                      <p className="mt-2 text-sm text-muted-foreground">La numérotation est séquentielle par catégorie et par année, garantissant la traçabilité pour l'audit.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="validation">
                    <AccordionTrigger>Circuit de validation</AccordionTrigger>
                    <AccordionContent>
                      <p>Les courriers suivent un circuit de validation hiérarchique :</p>
                      <ol className="list-decimal list-inside mt-2 space-y-2">
                        <li><strong>Direction RH</strong> : Première validation</li>
                        <li><strong>Direction Administrative</strong> : Deuxième validation</li>
                        <li><strong>Directeur Général</strong> : Signature finale</li>
                      </ol>
                      <p className="mt-2">À chaque étape, le valideur peut approuver ou rejeter avec un commentaire. Une fois signé, le document est verrouillé et ne peut plus être modifié.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="notifications-correspondance">
                    <AccordionTrigger>Notifications</AccordionTrigger>
                    <AccordionContent>
                      <p>Des notifications automatiques sont envoyées à chaque étape :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Email</strong> : Notification par email aux valideurs et destinataires</li>
                        <li><strong>In-app</strong> : Alerte dans l'application (icône cloche)</li>
                        <li><strong>Événements notifiés</strong> : validation requise, document signé, document rejeté, document disponible</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="audit">
                    <AccordionTrigger>Journal d'audit</AccordionTrigger>
                    <AccordionContent>
                      <p>Toutes les actions sont tracées dans un journal d'audit accessible via l'onglet <strong>Journal d'audit</strong> :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Création de document</li>
                        <li>Changements de statut</li>
                        <li>Validations et rejets</li>
                        <li>Signatures</li>
                        <li>Verrouillage</li>
                      </ul>
                      <p className="mt-2 text-sm text-muted-foreground">Chaque entrée enregistre l'auteur, la date/heure et les détails de l'action.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="pdf">
                    <AccordionTrigger>Export PDF</AccordionTrigger>
                    <AccordionContent>
                      <p>Les documents peuvent être exportés en PDF avec :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>En-tête officiel de l'organisation</li>
                        <li>Référence unique du document</li>
                        <li>Signature et cachet horodaté</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Recrutement */}
          <section id="recrutement">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  8. Recrutement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="offres">
                    <AccordionTrigger>Publier une offre d'emploi</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>Admin</strong> → <strong>Recrutement</strong></li>
                        <li>Cliquez sur "Nouvelle offre"</li>
                        <li>Remplissez : titre, description, exigences, nombre de postes</li>
                        <li>Choisissez le type : <strong>Interne</strong> (employés actuels) ou <strong>Externe</strong> (public)</li>
                        <li>Définissez la date limite</li>
                        <li>Publiez l'offre</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="candidatures">
                    <AccordionTrigger>Gérer les candidatures</AccordionTrigger>
                    <AccordionContent>
                      <p>Suivez les candidatures avec les statuts :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Soumise</strong> : Nouvelle candidature reçue</li>
                        <li><strong>En revue</strong> : En cours d'examen</li>
                        <li><strong>Entretien</strong> : Candidat retenu pour entretien</li>
                        <li><strong>Acceptée</strong> : Candidature approuvée</li>
                        <li><strong>Rejetée</strong> : Candidature non retenue</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="offres-externes">
                    <AccordionTrigger>Offres d'emploi publiques</AccordionTrigger>
                    <AccordionContent>
                      <p>Les offres externes sont accessibles via la page <strong>Carrières</strong> (/careers), visible sans connexion. Les candidats peuvent :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Consulter les offres disponibles</li>
                        <li>Soumettre leur candidature avec CV et lettre de motivation</li>
                        <li>Recevoir une notification par email</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="offres-internes">
                    <AccordionTrigger>Offres internes</AccordionTrigger>
                    <AccordionContent>
                      <p>Les employés de l'organisation peuvent postuler aux offres internes via le menu <strong>Offres Internes</strong>.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Évaluations */}
          <section id="evaluations">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  9. Évaluations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Le module d'évaluation permet de conduire les évaluations annuelles de performance.</p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="criteres">
                    <AccordionTrigger>Critères d'évaluation</AccordionTrigger>
                    <AccordionContent>
                      <p>Les critères sont configurables par organisation dans les paramètres. Chaque critère peut être noté selon une échelle standardisée.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="processus">
                    <AccordionTrigger>Processus d'évaluation</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>L'évaluateur crée une évaluation pour un employé</li>
                        <li>Il note chaque critère avec des recommandations</li>
                        <li>L'employé peut ajouter ses commentaires</li>
                        <li>Le superviseur valide l'évaluation</li>
                        <li>L'évaluation est finalisée avec une note globale</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Cartes de vœux */}
          <section id="cartes-voeux">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  10. Cartes de Vœux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="occasions">
                    <AccordionTrigger>Occasions disponibles</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Anniversaire</li>
                        <li>Fêtes de fin d'année</li>
                        <li>Fête des mères / pères</li>
                        <li>Promotion</li>
                        <li>Bienvenue</li>
                        <li>Départ à la retraite</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="envoi">
                    <AccordionTrigger>Envoyer une carte</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>RH</strong> → <strong>Cartes de vœux</strong></li>
                        <li>Sélectionnez l'occasion</li>
                        <li>Choisissez le destinataire</li>
                        <li>Personnalisez le message (optionnel)</li>
                        <li>Envoyez la carte par email</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="automatique">
                    <AccordionTrigger>Envoi automatique (anniversaires)</AccordionTrigger>
                    <AccordionContent>
                      <p>Le système peut envoyer automatiquement des cartes d'anniversaire aux employés dont la date de naissance est enregistrée dans leur profil.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Badges */}
          <section id="badges">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  11. Badges Employés
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Les badges d'identification affichent :</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Logo et nom de l'organisation</li>
                  <li>Photo de l'employé</li>
                  <li>Nom complet</li>
                  <li>Poste occupé</li>
                  <li>NIF (Numéro d'Identification Fiscale)</li>
                  <li>Groupe sanguin</li>
                  <li>QR Code pour le pointage</li>
                </ul>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium">Pour imprimer un badge :</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Menu <strong>RH</strong> → <strong>Badges employés</strong></li>
                    <li>Sélectionnez l'employé</li>
                    <li>Cliquez sur "Imprimer" ou "Télécharger"</li>
                  </ol>
                </div>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="font-medium">Personnalisation des badges :</p>
                  <p className="text-sm text-muted-foreground mt-1">Les administrateurs peuvent personnaliser le modèle de badge (en-tête, pied de page, style de bordure, durée de validité) dans les paramètres de l'organisation.</p>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Horaires Spéciaux */}
          <section id="horaires">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  12. Horaires Spéciaux
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="creation-horaire">
                    <AccordionTrigger>Créer un horaire spécial</AccordionTrigger>
                    <AccordionContent>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Menu <strong>RH</strong> → <strong>Horaires spéciaux</strong></li>
                        <li>Cliquez sur "Nouvel horaire"</li>
                        <li>Définissez le nom, les dates de début et fin</li>
                        <li>Configurez les jours de travail et heures</li>
                      </ol>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="assignation">
                    <AccordionTrigger>Assigner des employés</AccordionTrigger>
                    <AccordionContent>
                      <p>Assignez un ou plusieurs employés à un horaire spécial avec des heures de début et fin personnalisées et des jours de travail spécifiques.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Rôles */}
          <section id="roles">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  13. Gestion des Rôles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Les rôles disponibles dans le système :</p>
                <div className="grid gap-3 mt-4">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur Général</p>
                    <p className="text-sm text-muted-foreground">Accès complet à toutes les fonctionnalités, signature des documents officiels</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur Administratif</p>
                    <p className="text-sm text-muted-foreground">Gestion administrative, validation des correspondances</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur RH</p>
                    <p className="text-sm text-muted-foreground">Gestion des ressources humaines, employés, présences, correspondances</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Chef de Service</p>
                    <p className="text-sm text-muted-foreground">Supervision de son unité, approbation des congés</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Approbateur de Congés</p>
                    <p className="text-sm text-muted-foreground">Validation des demandes de congés</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Employé</p>
                    <p className="text-sm text-muted-foreground">Accès à son profil, QR Code, demandes de congé et candidatures internes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Paramètres */}
          <section id="parametres">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  14. Paramètres
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="organisation">
                    <AccordionTrigger>Informations de l'organisation</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Nom de l'organisation</li>
                        <li>Type d'organisation</li>
                        <li>Logo</li>
                        <li>Domaine personnalisé</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="domaine-personnalise">
                    <AccordionTrigger>Comment configurer un domaine personnalisé ?</AccordionTrigger>
                    <AccordionContent>
                      <p className="mb-3">Un domaine personnalisé permet à vos employés de s'inscrire via une URL dédiée (ex: <code className="bg-muted px-1 rounded">votre-organisation.exemple.com</code>).</p>
                      <p className="font-medium mb-2">Étapes de configuration :</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li>Accédez à <strong>Admin</strong> → <strong>Paramètres</strong> → <strong>Abonnement</strong></li>
                        <li>Dans la section "Domaine personnalisé", entrez votre nom de domaine</li>
                        <li>Cliquez sur "Mettre à jour le domaine"</li>
                      </ol>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="font-medium mb-2">Configuration DNS requise :</p>
                        <p className="text-sm mb-2">Ajoutez les enregistrements DNS suivants chez votre registrar :</p>
                        <div className="bg-background p-3 rounded border text-sm font-mono space-y-2">
                          <div>
                            <span className="text-muted-foreground">Type:</span> <span className="font-semibold">A</span><br/>
                            <span className="text-muted-foreground">Nom:</span> @ (domaine racine)<br/>
                            <span className="text-muted-foreground">Valeur:</span> 185.158.133.1
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span> <span className="font-semibold">A</span><br/>
                            <span className="text-muted-foreground">Nom:</span> www<br/>
                            <span className="text-muted-foreground">Valeur:</span> 185.158.133.1
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span> <span className="font-semibold">TXT</span><br/>
                            <span className="text-muted-foreground">Nom:</span> _lovable<br/>
                            <span className="text-muted-foreground">Valeur:</span> lovable_verify=[votre code]
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Important :</p>
                        <ul className="list-disc list-inside text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
                          <li>La propagation DNS peut prendre jusqu'à 72 heures</li>
                          <li>Le certificat SSL sera automatiquement provisionné</li>
                          <li>Disponible uniquement avec les abonnements Pro et Enterprise</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="personnalisation">
                    <AccordionTrigger>Personnalisation</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Couleur principale</li>
                        <li>Couleur secondaire</li>
                        <li>Couleur d'accent</li>
                        <li>Ces couleurs sont utilisées sur les badges et l'interface</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="unites">
                    <AccordionTrigger>Unités organisationnelles</AccordionTrigger>
                    <AccordionContent>
                      <p>Créez et gérez la structure :</p>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><strong>Directions</strong> : Départements principaux</li>
                        <li><strong>Services</strong> : Sous-unités rattachées aux directions</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="grille">
                    <AccordionTrigger>Grille salariale</AccordionTrigger>
                    <AccordionContent>
                      <p>Configurez les catégories d'employés et les postes avec leurs salaires associés.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="grades">
                    <AccordionTrigger>Grades de professeur</AccordionTrigger>
                    <AccordionContent>
                      <p>Gérez les grades académiques (Professeur, Maître de conférences, etc.) avec les salaires correspondants.</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Super Admin */}
          <section id="super-admin">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  15. Administration Plateforme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  Réservé aux super-administrateurs de la plateforme.
                </p>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="orgs">
                    <AccordionTrigger>Gestion des organisations</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Approuver les nouvelles organisations</li>
                        <li>Gérer les abonnements (Free, Basic, Pro, Enterprise)</li>
                        <li>Modifier les limites (utilisateurs, unités)</li>
                        <li>Enregistrer les paiements manuels</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="template">
                    <AccordionTrigger>Modèle de grille salariale</AccordionTrigger>
                    <AccordionContent>
                      <p>Le super-admin gère le modèle de grille salariale qui est automatiquement copié pour chaque nouvelle organisation approuvée.</p>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="plateforme">
                    <AccordionTrigger>Paramètres de la plateforme</AccordionTrigger>
                    <AccordionContent>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Configuration du propriétaire de la plateforme</li>
                        <li>Gestion des critères d'évaluation par défaut</li>
                        <li>Catégories d'employés modèles</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </CardContent>
            </Card>
          </section>

          {/* Support */}
          <Card className="print:shadow-none print:border-none">
            <CardHeader>
              <CardTitle>Besoin d'aide ?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Pour toute question ou assistance technique, contactez votre administrateur RH ou le support technique de la plateforme.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UserManual;
