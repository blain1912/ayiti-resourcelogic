import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, BookOpen, Users, QrCode, Calendar, Settings, Shield, Building, FileText } from "lucide-react";
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
              <li><a href="#badges" className="hover:text-primary">Badges Employés</a></li>
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
                  <li>Les badges d'identification</li>
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
                  7. Badges Employés
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
              </CardContent>
            </Card>
          </section>

          {/* Rôles */}
          <section id="roles">
            <Card className="print:shadow-none print:border-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  8. Gestion des Rôles
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>Les rôles disponibles dans le système :</p>
                <div className="grid gap-3 mt-4">
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur Général</p>
                    <p className="text-sm text-muted-foreground">Accès complet à toutes les fonctionnalités de l'organisation</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur Administratif</p>
                    <p className="text-sm text-muted-foreground">Gestion administrative et supervision</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Directeur RH</p>
                    <p className="text-sm text-muted-foreground">Gestion des ressources humaines, employés, présences</p>
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="font-medium">Employé</p>
                    <p className="text-sm text-muted-foreground">Accès à son profil, QR Code et demandes de congé</p>
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
                  9. Paramètres
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
                  10. Administration Plateforme
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
                        <li>Gérer les abonnements</li>
                        <li>Modifier les limites (utilisateurs, unités)</li>
                      </ul>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="template">
                    <AccordionTrigger>Modèle de grille salariale</AccordionTrigger>
                    <AccordionContent>
                      <p>Le super-admin gère le modèle de grille salariale qui est automatiquement copié pour chaque nouvelle organisation approuvée.</p>
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
