import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { FieldErrors } from "react-hook-form";
import type { ProfessorGradeData } from "@/hooks/useProfessorGrades";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { useAuth } from "@/hooks/useAuth";
import { useOrganizationCapabilities } from "@/hooks/useOrganizationCapabilities";
import type { OrganizationCapabilities } from "@/lib/organizationCapabilities";


const employeeFormSchema = z.object({
  code_budgetaire: z.string().optional(),

  photo_url: z.string().optional(),
  nom: z.string().min(2, "Nom requis"),
  prenom: z.string().min(2, "Prénom requis"),
  date_naissance: z.date({ required_error: "Date de naissance requise" }),
  lieu_naissance: z.string().min(2, "Lieu de naissance requis"),
  sexe: z.enum(["M", "F"], { required_error: "Sexe requis" }),
  nationalite: z.string().min(2, "Nationalité requise"),
  etat_civil: z.enum(["Célibataire", "Marié(e)", "Divorcé(e)", "Veuf(ve)", "Union libre"], { required_error: "État civil requis" }),
  groupe_sanguin: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
  religion: z.enum(["Vodouisant", "Catholique", "Protestant", "Autre"]).optional(),
  nif: z.string().optional(),
  cin: z.string().optional(),
  adresse_rue: z.string().optional(),
  adresse_ville: z.string().optional(),
  adresse_departement: z.enum(["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"]).optional(),
  adresse_pays_mission: z.string().optional(),
  code_postal: z.string().optional(),
  tel_1: z.string().min(8, "Téléphone requis"),
  tel_2: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email("Email invalide").optional(),
  contact_urgence_nom: z.string().min(2, "Nom du contact requis"),
  contact_urgence_prenom: z.string().min(2, "Prénom du contact requis"),
  contact_urgence_lien: z.string().min(2, "Lien requis"),
  contact_urgence_tel: z.string().min(8, "Téléphone du contact requis"),
  contact_urgence_whatsapp: z.string().optional(),
  date_entree_fonction: z.date().optional(),
  unit_id: z.string().min(1, "Structure d'affectation requise"),
  employee_category: z.string().optional(),
  position_id: z.string().optional(),
  fonction_responsabilite: z.string().optional(),
  staff_status: z.string().optional(),
  employment_type: z.enum(["permanent", "contractuel", "journalier", "professeur"]).optional(),
  employee_status: z.enum(["actif", "conge_annuel", "conge_maladie", "conge_maternite", "conge_etudes", "mis_a_disposition", "transfere", "renvoye", "decede"], { required_error: "Statut requis" }),
  professor_grade: z.enum(["assistant", "adjoint", "associe", "titulaire", "emerite"]).optional(),
  niveau_etudes: z.enum(["Universitaire", "Professionnel", "Secondaire", "Fondamental 1er cycle", "Fondamental 2ème cycle", "Fondamental 3ème cycle", "Primaire"]).optional(),
  professor_code_budgetaire: z.string().optional(),
  professor_salary: z.coerce.number().optional(),
  professor_date_entree_fonction: z.date().optional(),
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

/**
 * Le schéma effectif dépend des capacités de l'organisation :
 * une donnée n'est requise que là où la capacité correspondante est active.
 * Aucune valeur existante n'est effacée lorsqu'un champ est masqué.
 */
const buildEmployeeFormSchema = (capabilities: OrganizationCapabilities) =>
  employeeFormSchema.superRefine((data, ctx) => {
    const require = (ok: boolean, path: keyof EmployeeFormData, message: string) => {
      if (!ok) ctx.addIssue({ code: z.ZodIssueCode.custom, message, path: [path] });
    };
    if (data.employment_type === "professeur" && !data.professor_grade) {
      require(false, "professor_grade", "Veuillez sélectionner un grade de professeur");
    }
    if (capabilities.supports_budget_code) {
      require(!!data.code_budgetaire?.trim(), "code_budgetaire", "Code budgétaire requis");
    }
    if (capabilities.supports_employment_type) {
      require(!!data.employment_type, "employment_type", "Type d'employé requis");
    }
    if (capabilities.supports_home_address) {
      require((data.adresse_rue?.trim().length ?? 0) >= 3, "adresse_rue", "Adresse requise");
      require((data.adresse_ville?.trim().length ?? 0) >= 2, "adresse_ville", "Ville requise");
      require(!!data.adresse_departement, "adresse_departement", "Département requis");
    }
    if (capabilities.supports_mission_address) {
      require(
        (data.adresse_pays_mission?.trim().length ?? 0) >= 3,
        "adresse_pays_mission",
        "Adresse dans le pays de mission requise",
      );
    }
    // Position is now optional for all employment types
  });



// Composant séparé pour gérer la date d'entrée en fonction avec état local
function DateEntreeFonctionField({ form, label = "Date d'entrée en fonction" }: { form: ReturnType<typeof useForm<EmployeeFormData>>; label?: string }) {
  const dateValue = form.watch("date_entree_fonction");
  
  const [dayInput, setDayInput] = useState(dateValue ? dateValue.getDate().toString().padStart(2, '0') : '');
  const [monthInput, setMonthInput] = useState(dateValue ? (dateValue.getMonth() + 1).toString().padStart(2, '0') : '');
  const [yearInput, setYearInput] = useState(dateValue ? dateValue.getFullYear().toString() : '');

  // Sync inputs when dateValue changes externally
  useEffect(() => {
    if (dateValue) {
      setDayInput(dateValue.getDate().toString().padStart(2, '0'));
      setMonthInput((dateValue.getMonth() + 1).toString().padStart(2, '0'));
      setYearInput(dateValue.getFullYear().toString());
    }
  }, [dateValue]);

  const tryUpdateDate = (day: string, month: string, year: string) => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);

    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1960 && y <= new Date().getFullYear()) {
      const newDate = new Date(y, m - 1, d);
      // Validate that the date is valid (e.g., not Feb 31)
      if (newDate.getDate() === d && newDate.getMonth() === m - 1 && newDate <= new Date()) {
        form.setValue("date_entree_fonction", newDate);
      }
    }
  };

  return (
    <FormField
      control={form.control}
      name="date_entree_fonction"
      render={() => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input
                type="text"
                placeholder="JJ"
                maxLength={2}
                className="w-16 text-center"
                value={dayInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setDayInput(value);
                  tryUpdateDate(value, monthInput, yearInput);
                }}
              />
            </FormControl>
            <span className="flex items-center text-muted-foreground">/</span>
            <FormControl>
              <Input
                type="text"
                placeholder="MM"
                maxLength={2}
                className="w-16 text-center"
                value={monthInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setMonthInput(value);
                  tryUpdateDate(dayInput, value, yearInput);
                }}
              />
            </FormControl>
            <span className="flex items-center text-muted-foreground">/</span>
            <FormControl>
              <Input
                type="text"
                placeholder="AAAA"
                maxLength={4}
                className="w-20 text-center"
                value={yearInput}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setYearInput(value);
                  tryUpdateDate(dayInput, monthInput, value);
                }}
              />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// Composant pour la date d'entrée en fonction du poste cumulé (professeur)
function ProfessorDateEntreeFonctionField({ form }: { form: ReturnType<typeof useForm<EmployeeFormData>> }) {
  const dateValue = form.watch("professor_date_entree_fonction");
  const [dayInput, setDayInput] = useState(dateValue ? dateValue.getDate().toString().padStart(2, '0') : '');
  const [monthInput, setMonthInput] = useState(dateValue ? (dateValue.getMonth() + 1).toString().padStart(2, '0') : '');
  const [yearInput, setYearInput] = useState(dateValue ? dateValue.getFullYear().toString() : '');

  useEffect(() => {
    if (dateValue) {
      setDayInput(dateValue.getDate().toString().padStart(2, '0'));
      setMonthInput((dateValue.getMonth() + 1).toString().padStart(2, '0'));
      setYearInput(dateValue.getFullYear().toString());
    }
  }, [dateValue]);

  const tryUpdateDate = (day: string, month: string, year: string) => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    if (!isNaN(d) && !isNaN(m) && !isNaN(y) && d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1960 && y <= new Date().getFullYear()) {
      const newDate = new Date(y, m - 1, d);
      if (newDate.getDate() === d && newDate.getMonth() === m - 1 && newDate <= new Date()) {
        form.setValue("professor_date_entree_fonction", newDate);
      }
    }
  };

  return (
    <FormField
      control={form.control}
      name="professor_date_entree_fonction"
      render={() => (
        <FormItem className="flex flex-col">
          <FormLabel>Date d'entrée en fonction (poste cumulé)</FormLabel>
          <div className="flex gap-2">
            <FormControl>
              <Input type="text" placeholder="JJ" maxLength={2} className="w-16 text-center" value={dayInput}
                onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); setDayInput(value); tryUpdateDate(value, monthInput, yearInput); }} />
            </FormControl>
            <span className="flex items-center text-muted-foreground">/</span>
            <FormControl>
              <Input type="text" placeholder="MM" maxLength={2} className="w-16 text-center" value={monthInput}
                onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); setMonthInput(value); tryUpdateDate(dayInput, value, yearInput); }} />
            </FormControl>
            <span className="flex items-center text-muted-foreground">/</span>
            <FormControl>
              <Input type="text" placeholder="AAAA" maxLength={4} className="w-20 text-center" value={yearInput}
                onChange={(e) => { const value = e.target.value.replace(/\D/g, ''); setYearInput(value); tryUpdateDate(dayInput, monthInput, value); }} />
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}


interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  defaultValues?: Partial<EmployeeFormData>;
  units: Array<{ id: string; name: string; type?: string; parent_id?: string | null }>;
  positions: Array<{ id: string; name: string; salary: number }>;
  professorGrades?: ProfessorGradeData[];
  isLoading?: boolean;
}

export function EmployeeForm({ onSubmit, defaultValues, units, positions, professorGrades = [], isLoading }: EmployeeFormProps) {
  const [anneesService, setAnneesService] = useState<number | null>(null);
  const [employeeCategories, setEmployeeCategories] = useState<Array<{ id: string; name: string }>>([]);
  const { user } = useAuth();
  const { capabilities } = useOrganizationCapabilities();


  // Fetch employee categories from DB
  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("employee_categories")
        .select("id, name")
        .order("name");
      if (data) setEmployeeCategories(data);
    };
    fetchCategories();
  }, []);
  
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(buildEmployeeFormSchema(capabilities)),
    defaultValues: defaultValues || {
      nationalite: "Haïtienne",
      etat_civil: "Célibataire",
      employment_type: "permanent",
      employee_status: "actif",
    },
  });

  const { isSubmitting } = form.formState;

  const calculateAge = (birthDate: Date) => {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const selectedBirthDate = form.watch("date_naissance");
  const employmentType = form.watch("employment_type");
  const selectedUnitId = form.watch("unit_id");
  const dateEntreeFonction = form.watch("date_entree_fonction");
  const age = selectedBirthDate ? calculateAge(selectedBirthDate) : null;
  const isProfessor = employmentType === "professeur";
  const [isAlsoProfessor, setIsAlsoProfessor] = useState(false);

  // Initialize isAlsoProfessor from default values (any professor_* field signals cumul)
  useEffect(() => {
    if (
      defaultValues?.employment_type !== "professeur" &&
      (defaultValues?.professor_grade ||
        defaultValues?.professor_code_budgetaire ||
        defaultValues?.professor_salary ||
        defaultValues?.professor_date_entree_fonction)
    ) {
      setIsAlsoProfessor(true);
    }
  }, [defaultValues]);

  /**
   * Liste unique et hiérarchisée des structures de l'organisation courante.
   * Toutes les familles d'organisation (administrative, diplomatique…) utilisent
   * le même champ « Structure d'affectation » : le type Direction reste utilisable,
   * il n'est simplement plus le nom générique du champ.
   */
  const structureOptions = useMemo(() => {
    const byParent = new Map<string | null, typeof units>();
    const ids = new Set(units.map((u) => u.id));
    units.forEach((u) => {
      const parent = u.parent_id && ids.has(u.parent_id) ? u.parent_id : null;
      byParent.set(parent, [...(byParent.get(parent) || []), u]);
    });
    const out: Array<{ id: string; name: string; depth: number }> = [];
    const walk = (parent: string | null, depth: number) => {
      const children = [...(byParent.get(parent) || [])].sort((a, b) =>
        a.name.localeCompare(b.name, "fr"),
      );
      children.forEach((child) => {
        out.push({ id: child.id, name: child.name, depth });
        walk(child.id, depth + 1);
      });
    };
    walk(null, 0);
    return out;
  }, [units]);


  // Calculer les années de service
  useEffect(() => {
    if (dateEntreeFonction) {
      const entreeYear = new Date(dateEntreeFonction).getFullYear();
      const currentYear = new Date().getFullYear();
      setAnneesService(currentYear - entreeYear);
    } else {
      setAnneesService(null);
    }
  }, [dateEntreeFonction]);

  const GRADE_LABELS: Record<string, string> = {
    assistant: "Assistant",
    adjoint: "Adjoint",
    associe: "Associé",
    titulaire: "Titulaire",
    emerite: "Émérite",
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(
          onSubmit,
          (errors: FieldErrors<EmployeeFormData>) => {
            const firstError = Object.values(errors)[0] as any;
            toast({
              title: "Champs requis manquants",
              description: firstError?.message || "Veuillez vérifier le formulaire.",
              variant: "destructive",
            });
          }
        )}
        className="space-y-6"
      >
        {/* Informations de base */}
        <Card>
          <CardHeader>
            <CardTitle>Informations personnelles</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.supports_budget_code && (
              <FormField
                control={form.control}
                name="code_budgetaire"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code budgétaire *</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            <FormField
              control={form.control}
              name="photo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photo de profil</FormLabel>
                  <FormControl>
                    <PhotoUpload
                      value={field.value}
                      onChange={field.onChange}
                      userId={user?.id || 'temp'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_naissance"
              render={({ field }) => {
                const [dateInput, setDateInput] = useState(field.value ? format(field.value, "dd/MM/yyyy") : "");
                
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date de naissance *</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        placeholder="jj/mm/aaaa"
                        value={dateInput}
                        onChange={(e) => {
                          const value = e.target.value;
                          setDateInput(value);
                          
                          // Essayer de parser la date si le format est complet
                          const parts = value.split("/");
                          if (parts.length === 3 && parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
                            const day = parseInt(parts[0]);
                            const month = parseInt(parts[1]) - 1;
                            const year = parseInt(parts[2]);
                            
                            if (!isNaN(day) && !isNaN(month) && !isNaN(year) && year > 1900 && year < 2100) {
                              const date = new Date(year, month, day);
                              if (date.getDate() === day && date.getMonth() === month) {
                                field.onChange(date);
                              }
                            }
                          }
                        }}
                        onBlur={() => {
                          // Reformater au blur si une date valide existe
                          if (field.value) {
                            setDateInput(format(field.value, "dd/MM/yyyy"));
                          }
                        }}
                        className="flex-1"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            type="button"
                            className={cn(
                              "w-10 p-0",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              field.onChange(date);
                              if (date) {
                                setDateInput(format(date, "dd/MM/yyyy"));
                              }
                            }}
                            disabled={(date) => date > new Date() || date < new Date("1940-01-01")}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    {age && <p className="text-sm text-muted-foreground">Âge: {age} ans</p>}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="lieu_naissance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lieu de naissance *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sexe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sexe *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="M">Masculin</SelectItem>
                      <SelectItem value="F">Féminin</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationalite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nationalité *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="etat_civil"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État civil *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Célibataire">Célibataire</SelectItem>
                      <SelectItem value="Marié(e)">Marié(e)</SelectItem>
                      <SelectItem value="Divorcé(e)">Divorcé(e)</SelectItem>
                      <SelectItem value="Veuf(ve)">Veuf(ve)</SelectItem>
                      <SelectItem value="Union libre">Union libre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="groupe_sanguin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Groupe sanguin</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => (
                        <SelectItem key={group} value={group}>{group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="religion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Religion</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Vodouisant">Vodouisant</SelectItem>
                      <SelectItem value="Catholique">Catholique</SelectItem>
                      <SelectItem value="Protestant">Protestant</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nif"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>NIF</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CIN</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Adresse */}
        <Card>
          <CardHeader>
            <CardTitle>Adresse</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="adresse_rue"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Rue # *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adresse_ville"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="adresse_departement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Département *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"].map((dept) => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code_postal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code postal</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Informations de contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tel_1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone 1 *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+509..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tel_2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+509..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+509..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Contact d'urgence */}
        <Card>
          <CardHeader>
            <CardTitle>Personne à contacter en cas d'urgence</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="contact_urgence_nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_urgence_prenom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_urgence_lien"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lien (relation) *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: Époux(se), Parent, Ami(e)..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_urgence_tel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+509..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contact_urgence_whatsapp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>WhatsApp</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+509..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Separator />

        {/* Informations professionnelles */}
        <Card>
          <CardHeader>
            <CardTitle>Informations professionnelles</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DateEntreeFonctionField form={form} label={capabilities.entry_date_label} />

            {capabilities.supports_years_of_service && (
              <FormItem>
                <FormLabel>Nombre d'années de service</FormLabel>
                <FormControl>
                  <Input
                    value={anneesService !== null ? `${anneesService} ans` : "—"}
                    disabled
                    className="bg-muted"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">Calculé automatiquement</p>
              </FormItem>
            )}


            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Structure d'affectation *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une structure" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {structureOptions.length === 0 ? (
                        <div className="px-2 py-3 text-sm text-muted-foreground">
                          Aucune structure configurée pour cette organisation
                        </div>
                      ) : (
                        structureOptions.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.depth > 0 ? `${"— ".repeat(unit.depth)}${unit.name}` : unit.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="employee_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie d'employé</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {employeeCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* « Niveau d'études » est désormais présenté dans la section Formation et qualifications */}



            <FormField
              control={form.control}
              name="position_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Poste {!isProfessor && "*"}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isProfessor && !isAlsoProfessor || positions.length === 0}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={positions.length === 0 ? "Aucun poste disponible" : "Sélectionner"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.length === 0 ? (
                        <SelectItem value="none" disabled>Aucun poste configuré</SelectItem>
                      ) : (
                        positions.map((position) => (
                          <SelectItem key={position.id} value={position.id}>
                            {position.name} - {position.salary.toLocaleString()} HTG
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {isProfessor && !isAlsoProfessor && (
                    <p className="text-sm text-muted-foreground">
                      Non applicable pour les professeurs
                    </p>
                  )}
                  {!isProfessor && positions.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Veuillez d'abord créer des postes dans Paramètres → Grille Salariale
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {capabilities.supports_staff_status && (
              <FormField
                control={form.control}
                name="staff_status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut administratif</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STAFF_STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {capabilities.supports_function_title && (
              <FormField
                control={form.control}
                name="fonction_responsabilite"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fonction / responsabilité</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex : Responsable du Service commercial"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {capabilities.supports_employment_type && (
              <FormField
                control={form.control}
                name="employment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type d'employé *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="permanent">Permanent</SelectItem>
                        <SelectItem value="contractuel">Contractuel</SelectItem>
                        <SelectItem value="journalier">Journalier</SelectItem>
                        {(capabilities.supports_teaching_role || employmentType === "professeur") && (
                          <SelectItem value="professeur">Professeur</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            {capabilities.supports_teaching_role && !isProfessor && (
              <div className="flex items-center gap-3 col-span-full">
                <Switch
                  checked={isAlsoProfessor}
                  onCheckedChange={(checked) => {
                    setIsAlsoProfessor(checked);
                    if (!checked) {
                      form.setValue("professor_grade", undefined);
                      form.setValue("professor_code_budgetaire", undefined);
                      form.setValue("professor_salary", undefined);
                      form.setValue("professor_date_entree_fonction", undefined);
                    }
                  }}
                />
                <label className="text-sm font-medium">
                  Aussi professeur (cumul de poste)
                </label>
              </div>
            )}

            {(isProfessor || isAlsoProfessor) && (
              <>
                <FormField
                  control={form.control}
                  name="professor_grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade de professeur *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {professorGrades.length > 0
                            ? professorGrades.map((grade) => (
                                <SelectItem key={grade.id} value={grade.grade}>
                                  {GRADE_LABELS[grade.grade]} - {grade.salary.toLocaleString()} HTG
                                </SelectItem>
                              ))
                            : (["assistant", "adjoint", "associe", "titulaire", "emerite"] as const).map((g) => (
                                <SelectItem key={g} value={g}>
                                  {GRADE_LABELS[g]}
                                </SelectItem>
                              ))}
                        </SelectContent>
                      </Select>
                      {professorGrades.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Astuce : configurez les grades et salaires dans Paramètres &gt; Grades de professeurs pour afficher les montants.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />


                {isAlsoProfessor && (
                  <>
                    <FormField
                      control={form.control}
                      name="professor_code_budgetaire"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Code budgétaire (poste professeur)</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Code budgétaire du poste cumulé" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="professor_salary"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Salaire professeur (HTG)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              placeholder="Salaire du poste cumulé"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <ProfessorDateEntreeFonctionField form={form} />
                  </>
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="employee_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Statut *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="conge_annuel">Congé annuel</SelectItem>
                      <SelectItem value="conge_maladie">Congé maladie</SelectItem>
                      <SelectItem value="conge_maternite">Congé maternité</SelectItem>
                      <SelectItem value="conge_etudes">Congé d'études</SelectItem>
                      <SelectItem value="mis_a_disposition">Mis à disposition</SelectItem>
                      <SelectItem value="transfere">Transféré</SelectItem>
                      <SelectItem value="renvoye">Renvoyé</SelectItem>
                      <SelectItem value="decede">Décédé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {capabilities.supports_education_fields && (
          <>
            <Separator />

            {/* Formation et qualifications */}
            <Card>
              <CardHeader>
                <CardTitle>Formation et qualifications</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="niveau_etudes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Niveau d'études</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Universitaire">Universitaire</SelectItem>
                          <SelectItem value="Professionnel">Professionnel</SelectItem>
                          <SelectItem value="Secondaire">Secondaire</SelectItem>
                          <SelectItem value="Fondamental 1er cycle">Fondamental 1er cycle</SelectItem>
                          <SelectItem value="Fondamental 2ème cycle">Fondamental 2ème cycle</SelectItem>
                          <SelectItem value="Fondamental 3ème cycle">Fondamental 3ème cycle</SelectItem>
                          <SelectItem value="Primaire">Primaire</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </>
        )}


        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
