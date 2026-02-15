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
import { useState, useEffect } from "react";
import { toast } from "@/hooks/use-toast";
import type { FieldErrors } from "react-hook-form";
import type { ProfessorGradeData } from "@/hooks/useProfessorGrades";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { useAuth } from "@/hooks/useAuth";

const employeeFormSchema = z.object({
  code_budgetaire: z.string().min(1, "Code budgétaire requis"),
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
  adresse_rue: z.string().min(3, "Adresse requise"),
  adresse_ville: z.string().min(2, "Ville requise"),
  adresse_departement: z.enum(["Artibonite", "Centre", "Grand'Anse", "Nippes", "Nord", "Nord-Est", "Nord-Ouest", "Ouest", "Sud", "Sud-Est"], { required_error: "Département requis" }),
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
  unit_id: z.string().min(1, "Direction/Service requis"),
  employee_category: z.enum([
    "Personnel de décision",
    "Personnel d'encadrement",
    "Personnel Professionnel certifié ou diplômé",
    "Personnel administratif",
    "Personnel de soutien",
    "Professeur"
  ]).optional(),
  position_id: z.string().optional(),
  employment_type: z.enum(["permanent", "contractuel", "journalier", "professeur"], { required_error: "Type d'employé requis" }),
  employee_status: z.enum(["actif", "conge_annuel", "conge_maladie", "conge_maternite", "conge_etudes", "mis_a_disposition", "transfere", "renvoye", "decede"], { required_error: "Statut requis" }),
  professor_grade: z.enum(["assistant", "adjoint", "associe", "titulaire", "emerite"]).optional(),
}).superRefine((data, ctx) => {
  if (data.employment_type === "professeur" && !data.professor_grade) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Veuillez sélectionner un grade de professeur",
      path: ["professor_grade"],
    });
  }
  // Position is required for non-professor types (even if also professor)
  if (data.employment_type !== "professeur" && !data.position_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Veuillez sélectionner un poste",
      path: ["position_id"],
    });
  }
});

type EmployeeFormData = z.infer<typeof employeeFormSchema>;

// Composant séparé pour gérer la date d'entrée en fonction avec état local
function DateEntreeFonctionField({ form }: { form: ReturnType<typeof useForm<EmployeeFormData>> }) {
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
          <FormLabel>Date d'entrée en fonction</FormLabel>
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

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>;
  defaultValues?: Partial<EmployeeFormData>;
  units: Array<{ id: string; name: string; type?: string; parent_id?: string | null }>;
  positions: Array<{ id: string; name: string; salary: number }>;
  professorGrades?: ProfessorGradeData[];
  isLoading?: boolean;
}

export function EmployeeForm({ onSubmit, defaultValues, units, positions, professorGrades = [], isLoading }: EmployeeFormProps) {
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>("");
  const [anneesService, setAnneesService] = useState<number | null>(null);
  const { user } = useAuth();
  
  const form = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeFormSchema),
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

  // Initialize isAlsoProfessor from default values
  useEffect(() => {
    if (defaultValues?.professor_grade && defaultValues?.employment_type !== "professeur") {
      setIsAlsoProfessor(true);
    }
  }, [defaultValues]);

  // Filtrer les directions (direction_generale, direction_technique)
  const directions = units.filter(unit => 
    unit.type === "direction_generale" || unit.type === "direction_technique"
  );

  // Filtrer les services selon la direction sélectionnée
  const services = units.filter(unit => 
    unit.type === "service" && unit.parent_id === selectedDirectionId
  );

  // Initialiser selectedDirectionId si defaultValues a un unit_id
  useEffect(() => {
    if (defaultValues?.unit_id && units.length > 0) {
      const selectedUnit = units.find(u => u.id === defaultValues.unit_id);
      if (selectedUnit) {
        if (selectedUnit.type === "service" && selectedUnit.parent_id) {
          setSelectedDirectionId(selectedUnit.parent_id);
        } else if (selectedUnit.type === "direction_generale" || selectedUnit.type === "direction_technique") {
          setSelectedDirectionId(selectedUnit.id);
        }
      }
    }
  }, [defaultValues?.unit_id, units]);

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
            <FormField
              control={form.control}
              name="code_budgetaire"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code budgétaire *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
            <DateEntreeFonctionField form={form} />

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

            <FormField
              control={form.control}
              name="unit_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Direction *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      setSelectedDirectionId(value);
                      // Si on change de direction, on met unit_id à la direction
                      field.onChange(value);
                    }} 
                    value={selectedDirectionId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une direction" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {directions.map((direction) => (
                        <SelectItem key={direction.id} value={direction.id}>
                          {direction.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedDirectionId && services.length > 0 && (
              <FormField
                control={form.control}
                name="unit_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Services</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={services.find(s => s.id === field.value) ? field.value : ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un service (optionnel)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={selectedDirectionId}>Aucun service (Direction uniquement)</SelectItem>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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
                      <SelectItem value="Personnel de décision">Personnel de décision</SelectItem>
                      <SelectItem value="Personnel d'encadrement">Personnel d'encadrement</SelectItem>
                      <SelectItem value="Personnel Professionnel certifié ou diplômé">Personnel Professionnel certifié ou diplômé</SelectItem>
                      <SelectItem value="Personnel administratif">Personnel administratif</SelectItem>
                      <SelectItem value="Personnel de soutien">Personnel de soutien</SelectItem>
                      <SelectItem value="Professeur">Professeur</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                      <SelectItem value="professeur">Professeur</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isProfessor && (
              <div className="flex items-center gap-3 col-span-full">
                <Switch
                  checked={isAlsoProfessor}
                  onCheckedChange={(checked) => {
                    setIsAlsoProfessor(checked);
                    if (!checked) {
                      form.setValue("professor_grade", undefined);
                    }
                  }}
                />
                <label className="text-sm font-medium">
                  Aussi professeur (cumul de poste)
                </label>
              </div>
            )}

            {(isProfessor || isAlsoProfessor) && (
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
                        {professorGrades.map((grade) => (
                          <SelectItem key={grade.id} value={grade.grade}>
                            {GRADE_LABELS[grade.grade]} - {grade.salary.toLocaleString()} HTG
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={isLoading || isSubmitting}>
            {isLoading || isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
