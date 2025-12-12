import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Sparkles, Crown, Building2, Users, FolderTree, Globe } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Organization = Database["public"]["Tables"]["organizations"]["Row"];

interface SubscriptionInfoProps {
  organization: Organization;
  onUpdate: () => void;
}

export const SubscriptionInfo = ({ organization, onUpdate }: SubscriptionInfoProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [customDomain, setCustomDomain] = useState(organization.custom_domain || "");

  const plans = {
    free: {
      name: "Free",
      icon: Sparkles,
      color: "bg-muted",
      features: ["5 utilisateurs", "3 unités organisationnelles", "Support communautaire"]
    },
    pro: {
      name: "Pro",
      icon: Crown,
      color: "bg-primary",
      features: ["50 utilisateurs", "20 unités organisationnelles", "Domaine personnalisé", "Support prioritaire"]
    },
    enterprise: {
      name: "Enterprise",
      icon: Building2,
      color: "bg-accent",
      features: ["Utilisateurs illimités", "Unités illimitées", "Domaine personnalisé", "Support dédié", "SLA garanti"]
    }
  };

  const currentPlan = plans[organization.subscription_tier as keyof typeof plans];
  const PlanIcon = currentPlan.icon;

  const handleUpgrade = async (tier: 'free' | 'pro' | 'enterprise') => {
    setIsUpdating(true);
    try {
      const maxUsers = tier === 'pro' ? 50 : tier === 'enterprise' ? 999999 : 5;
      const maxUnits = tier === 'pro' ? 20 : tier === 'enterprise' ? 999999 : 3;

      const { error } = await supabase
        .from("organizations")
        .update({
          subscription_tier: tier,
          max_users: maxUsers,
          max_units: maxUnits,
        })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Plan mis à jour",
        description: `Votre plan a été changé vers ${tier}`,
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDomainUpdate = async () => {
    const trimmedDomain = customDomain.trim();
    
    // If no change, show info toast
    if (trimmedDomain === (organization.custom_domain || "")) {
      toast({
        title: "Aucun changement",
        description: "Le domaine n'a pas été modifié",
      });
      return;
    }
    
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({ custom_domain: trimmedDomain || null })
        .eq("id", organization.id);

      if (error) throw error;

      toast({
        title: "Domaine mis à jour",
        description: trimmedDomain ? `Domaine configuré: ${trimmedDomain}` : "Domaine supprimé",
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const canUseDomain = organization.subscription_tier !== 'free';

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${currentPlan.color}`}>
                <PlanIcon className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Plan actuel: {currentPlan.name}</CardTitle>
                <CardDescription>
                  {organization.max_users} utilisateurs max, {organization.max_units} unités max
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-1">
              {currentPlan.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>Utilisateurs: {organization.max_users}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <FolderTree className="h-4 w-4 text-muted-foreground" />
                <span>Unités: {organization.max_units}</span>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-semibold mb-2">Fonctionnalités incluses:</h4>
              <ul className="space-y-1">
                {currentPlan.features.map((feature, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Plans disponibles</CardTitle>
          <CardDescription>Choisissez le plan qui correspond à vos besoins</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {Object.entries(plans).map(([key, plan]) => {
              const Icon = plan.icon;
              const isCurrent = key === organization.subscription_tier;
              
              return (
                <Card key={key} className={isCurrent ? "border-primary" : ""}>
                  <CardHeader>
                    <div className={`w-fit p-2 rounded-lg ${plan.color} mb-2`}>
                      <Icon className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-4">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleUpgrade(key as 'free' | 'pro' | 'enterprise')}
                      disabled={isCurrent || isUpdating}
                      className="w-full"
                      variant={isCurrent ? "secondary" : "default"}
                    >
                      {isCurrent ? "Plan actuel" : `Passer à ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Custom Domain */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            <CardTitle>Domaine personnalisé</CardTitle>
          </div>
          <CardDescription>
            {canUseDomain 
              ? "Configurez votre propre domaine pour que vos employés puissent s'inscrire directement"
              : "Disponible avec les plans Pro et Enterprise"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="domain">Votre domaine</Label>
              <Input
                id="domain"
                placeholder="rh.votreorganisation.com"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                disabled={!canUseDomain || isUpdating}
              />
              {!canUseDomain && (
                <p className="text-sm text-muted-foreground">
                  Upgradez vers Pro ou Enterprise pour utiliser un domaine personnalisé
                </p>
              )}
            </div>

            {canUseDomain && customDomain && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <h4 className="font-semibold text-sm mb-2">📋 Instructions de configuration DNS</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    Ajoutez ces enregistrements DNS chez votre registrar (GoDaddy, Namecheap, etc.) :
                  </p>
                  <div className="space-y-3 bg-background p-3 rounded border">
                    <div className="space-y-1">
                      <p className="text-xs font-mono font-semibold">Enregistrement A</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <span className="text-muted-foreground">Type:</span> <code className="bg-muted px-1 py-0.5 rounded">A</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Nom:</span> <code className="bg-muted px-1 py-0.5 rounded">{customDomain.replace(/^https?:\/\//, '')}</code>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Valeur:</span> <code className="bg-muted px-1 py-0.5 rounded">[IP de l'application]</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">✨ Comment ça fonctionne</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary">1.</span>
                      <span>Vos employés visitent <strong className="text-foreground">{customDomain}</strong></span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">2.</span>
                      <span>Le système détecte automatiquement votre organisation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">3.</span>
                      <span>L'inscription est pré-remplie avec {organization.name}</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary">4.</span>
                      <span>La page affiche votre logo et vos couleurs personnalisées</span>
                    </li>
                  </ul>
                </div>

                {organization.logo_url && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">🎨 Aperçu de votre page d'inscription</h4>
                    <div className="border rounded-lg p-4 bg-background">
                      <div className="flex flex-col items-center gap-3">
                        {organization.logo_url && (
                          <img 
                            src={organization.logo_url} 
                            alt={organization.name}
                            className="h-12 object-contain"
                          />
                        )}
                        <div className="text-center">
                          <h3 className="font-bold text-lg">{organization.name}</h3>
                          <p className="text-sm text-muted-foreground">Portail d'inscription</p>
                        </div>
                        <div className="w-full max-w-xs space-y-2">
                          <div className="h-8 bg-muted rounded animate-pulse" />
                          <div className="h-8 bg-muted rounded animate-pulse" />
                          <div 
                            className="h-10 rounded text-white text-sm font-medium flex items-center justify-center"
                            style={{ backgroundColor: organization.primary_color || '#0EA5E9' }}
                          >
                            S'inscrire
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {canUseDomain && (
              <Button
                onClick={handleDomainUpdate}
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? "Mise à jour..." : "Enregistrer le domaine"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};