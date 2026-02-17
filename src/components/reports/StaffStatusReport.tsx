import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInYears } from "date-fns";
import { fr } from "date-fns/locale";
import { FileDown, Printer } from "lucide-react";
import { exportToPdf } from "@/lib/exportPdf";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface EmployeeData {
  id: string;
  fullName: string;
  category: string;
  positionName: string;
  unitName: string;
  sexe: string;
  dateNaissance: string | null;
  dateEntree: string | null;
  age: number | null;
  seniority: number | null;
  professorGrade: string | null;
  professorDateEntree: string | null;
  professorSeniority: number | null;
  employmentType: string;
  isProfessor: boolean;
}

interface CategoryStat {
  name: string;
  count: number;
  percent: number;
}

interface BucketStat {
  label: string;
  count: number;
  percent: number;
}

export const StaffStatusReport = () => {
  const [loading, setLoading] = useState(true);
  const [orgName, setOrgName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);
  const [redactorName, setRedactorName] = useState("");
  const [redactorTitle, setRedactorTitle] = useState("Directeur des Ressources Humaines");
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [period, setPeriod] = useState(`Année ${new Date().getFullYear()}`);
  const [reportTitle, setReportTitle] = useState("Rapport sur l'état du personnel");
  const now = new Date();

  // Editable analysis sections
  const [introText, setIntroText] = useState(
    "Le présent rapport vise à dresser un état détaillé du personnel de l'institution afin d'appuyer la prise de décision en matière de gestion des ressources humaines.\nIl présente la structure des effectifs, le parcours professionnel des employés, leur ancienneté, leur âge ainsi que les perspectives d'évolution et de renouvellement du personnel."
  );

  const [problemsText, setProblemsText] = useState("");
  const [recoCourtTerme, setRecoCourtTerme] = useState("• Mise à jour des dossiers du personnel\n• Plan de formation\n• Réaffectation interne");
  const [recoMoyenTerme, setRecoMoyenTerme] = useState("• Plan de promotion\n• Recrutement ciblé\n• Programme de mentorat");
  const [recoLongTerme, setRecoLongTerme] = useState("• Plan de succession\n• Politique de relève\n• Gestion prévisionnelle des emplois");
  const [conclusionText, setConclusionText] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("organization_id, full_name").eq("user_id", user.id).single();
      if (profile?.organization_id) {
        setOrgId(profile.organization_id);
        setRedactorName(profile.full_name || "");
        const { data: org } = await supabase.from("organizations").select("name").eq("id", profile.organization_id).single();
        if (org) setOrgName(org.name);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (orgId) fetchData();
  }, [orgId]);

  const fetchData = async () => {
    if (!orgId) return;
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, sexe, date_naissance, date_entree_fonction, employee_category, employment_type, position_id, unit_id, professor_grade, professor_date_entree_fonction, organizational_units(name), positions(name, employee_categories(name))")
      .eq("organization_id", orgId)
      .eq("approval_status", "approved");

    if (!profiles) { setLoading(false); return; }

    const data: EmployeeData[] = profiles.map((p: any) => {
      const age = p.date_naissance ? differenceInYears(now, new Date(p.date_naissance)) : null;
      const seniority = p.date_entree_fonction ? differenceInYears(now, new Date(p.date_entree_fonction)) : null;
      const professorSeniority = p.professor_date_entree_fonction ? differenceInYears(now, new Date(p.professor_date_entree_fonction)) : null;
      const isProfessor = !!p.professor_grade || p.employment_type === "professeur";
      return {
        id: p.id,
        fullName: p.full_name || "Sans nom",
        category: p.positions?.employee_categories?.name || p.employee_category || "Non classé",
        positionName: p.positions?.name || "Non défini",
        unitName: p.organizational_units?.name || "Non affecté",
        sexe: p.sexe || "NR",
        dateNaissance: p.date_naissance,
        dateEntree: p.date_entree_fonction,
        age,
        seniority,
        professorGrade: p.professor_grade,
        professorDateEntree: p.professor_date_entree_fonction,
        professorSeniority,
        employmentType: p.employment_type || "permanent",
        isProfessor,
      };
    });

    setEmployees(data);
    generateAnalysis(data);
    setLoading(false);
  };

  const generateAnalysis = (data: EmployeeData[]) => {
    const total = data.length;
    if (total === 0) return;

    // Problems
    const over55 = data.filter(e => e.age !== null && e.age >= 55).length;
    const over20yrs = data.filter(e => e.seniority !== null && e.seniority >= 20).length;
    const problems: string[] = [];
    if (over55 / total > 0.2) problems.push("• Vieillissement du personnel : " + Math.round(over55 / total * 100) + "% des employés ont plus de 55 ans");
    if (over20yrs / total > 0.3) problems.push("• Risque de perte de mémoire institutionnelle : " + Math.round(over20yrs / total * 100) + "% du personnel a plus de 20 ans d'ancienneté");
    const noCategory = data.filter(e => e.category === "Non classé").length;
    if (noCategory > 0) problems.push("• " + noCategory + " employé(s) sans catégorie définie");
    const noPosition = data.filter(e => e.positionName === "Non défini").length;
    if (noPosition > 0) problems.push("• " + noPosition + " employé(s) sans poste défini");
    if (problems.length === 0) problems.push("• Aucun problème majeur identifié à ce stade");
    setProblemsText(problems.join("\n"));

    // Conclusion
    const avgAge = data.filter(e => e.age !== null).reduce((s, e) => s + (e.age ?? 0), 0) / (data.filter(e => e.age !== null).length || 1);
    setConclusionText(
      `L'analyse révèle un effectif de ${total} employés avec un âge moyen de ${avgAge.toFixed(0)} ans. ` +
      (over55 > 0 ? `${over55} employé(s) approchent de la retraite. ` : "") +
      "Il est recommandé de mettre en place une gestion prévisionnelle des ressources humaines afin d'assurer la pérennité des services."
    );
  };

  // Computed stats
  const total = employees.length;

  const categoryStats: CategoryStat[] = (() => {
    const map: Record<string, number> = {};
    employees.forEach(e => { map[e.category] = (map[e.category] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count, percent: total ? Math.round(count / total * 100) : 0 })).sort((a, b) => b.count - a.count);
  })();

  // Employment status stats
  const statusStats: CategoryStat[] = (() => {
    const statusLabels: Record<string, string> = {
      permanent: "Permanent",
      contractuel: "Contractuel",
      journalier: "Journalier",
      professeur: "Professeur",
    };
    const map: Record<string, number> = {};
    employees.forEach(e => {
      const label = statusLabels[e.employmentType] || e.employmentType;
      map[label] = (map[label] || 0) + 1;
    });
    // Add professors (those with professor_grade who aren't already typed as professeur)
    const professorCount = employees.filter(e => e.isProfessor && e.employmentType !== "professeur").length;
    if (professorCount > 0) {
      map["Professeur (cumul)"] = professorCount;
    }
    return Object.entries(map).map(([name, count]) => ({ name, count, percent: total ? Math.round(count / total * 100) : 0 })).sort((a, b) => b.count - a.count);
  })();

  // Gender stats
  const genderStats: CategoryStat[] = (() => {
    const labels: Record<string, string> = { M: "Masculin", F: "Féminin" };
    const map: Record<string, number> = {};
    employees.forEach(e => {
      const label = labels[e.sexe] || "Non renseigné";
      map[label] = (map[label] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count, percent: total ? Math.round(count / total * 100) : 0 })).sort((a, b) => b.count - a.count);
  })();

  // Gender analysis text
  const genderAnalysis = (() => {
    const m = employees.filter(e => e.sexe === "M").length;
    const f = employees.filter(e => e.sexe === "F").length;
    const mPct = total ? Math.round(m / total * 100) : 0;
    const fPct = total ? Math.round(f / total * 100) : 0;
    if (m > f) return `Le personnel est majoritairement masculin (${mPct}%) avec ${fPct}% de femmes.`;
    if (f > m) return `Le personnel est majoritairement féminin (${fPct}%) avec ${mPct}% d'hommes.`;
    return `La répartition par sexe est équilibrée : ${mPct}% d'hommes et ${fPct}% de femmes.`;
  })();

  // Status analysis text
  const statusAnalysis = (() => {
    const permanent = employees.filter(e => e.employmentType === "permanent").length;
    const pct = total ? Math.round(permanent / total * 100) : 0;
    const profCount = employees.filter(e => e.isProfessor).length;
    let text = `${pct}% du personnel est permanent.`;
    if (profCount > 0) text += ` L'institution compte ${profCount} professeur(s) dans ses effectifs.`;
    return text;
  })();

  const seniorityBuckets: BucketStat[] = (() => {
    const buckets = [
      { label: "0 – 5 ans", filter: (s: number) => s >= 0 && s <= 5 },
      { label: "6 – 10 ans", filter: (s: number) => s >= 6 && s <= 10 },
      { label: "11 – 20 ans", filter: (s: number) => s >= 11 && s <= 20 },
      { label: "21 – 30 ans", filter: (s: number) => s >= 21 && s <= 30 },
      { label: "+ 30 ans", filter: (s: number) => s > 30 },
    ];
    return buckets.map(b => {
      const count = employees.filter(e => e.seniority !== null && b.filter(e.seniority)).length;
      return { label: b.label, count, percent: total ? Math.round(count / total * 100) : 0 };
    });
  })();

  const ageBuckets: BucketStat[] = (() => {
    const buckets = [
      { label: "Moins de 30 ans", filter: (a: number) => a < 30 },
      { label: "30 – 39 ans", filter: (a: number) => a >= 30 && a <= 39 },
      { label: "40 – 49 ans", filter: (a: number) => a >= 40 && a <= 49 },
      { label: "50 – 59 ans", filter: (a: number) => a >= 50 && a <= 59 },
      { label: "60 ans et +", filter: (a: number) => a >= 60 },
    ];
    return buckets.map(b => {
      const count = employees.filter(e => e.age !== null && b.filter(e.age)).length;
      return { label: b.label, count, percent: total ? Math.round(count / total * 100) : 0 };
    });
  })();

  // Cross analysis: age x seniority
  const crossAgeSeniority = (() => {
    const ageRanges = ["< 30", "30-39", "40-49", "50-59", "60+"];
    const senRanges = ["0-5", "6-10", "11-20", "21-30", "30+"];
    const ageFilters = [(a: number) => a < 30, (a: number) => a >= 30 && a < 40, (a: number) => a >= 40 && a < 50, (a: number) => a >= 50 && a < 60, (a: number) => a >= 60];
    const senFilters = [(s: number) => s <= 5, (s: number) => s >= 6 && s <= 10, (s: number) => s >= 11 && s <= 20, (s: number) => s >= 21 && s <= 30, (s: number) => s > 30];
    
    return ageRanges.map((ageLabel, ai) => ({
      ageLabel,
      values: senRanges.map((_, si) => employees.filter(e => e.age !== null && e.seniority !== null && ageFilters[ai](e.age!) && senFilters[si](e.seniority!)).length),
    }));
  })();

  const senRangeHeaders = ["0-5 ans", "6-10 ans", "11-20 ans", "21-30 ans", "30+ ans"];

  // Generate seniority analysis text
  const seniorityAnalysis = (() => {
    const over20 = seniorityBuckets.filter(b => b.label.includes("21") || b.label.includes("30")).reduce((s, b) => s + b.count, 0);
    const pct = total ? Math.round(over20 / total * 100) : 0;
    if (pct > 30) return `L'institution présente un vieillissement des effectifs : ${pct}% du personnel possède plus de 20 ans d'ancienneté. Cette situation nécessite une politique de relève.`;
    return `La répartition de l'ancienneté montre un équilibre relatif avec ${pct}% du personnel ayant plus de 20 ans d'ancienneté.`;
  })();

  // Generate age analysis text
  const ageAnalysis = (() => {
    const over55 = employees.filter(e => e.age !== null && e.age >= 55).length;
    const pct = total ? Math.round(over55 / total * 100) : 0;
    if (pct > 15) return `${pct}% des employés ont plus de 55 ans, ce qui annonce plusieurs départs à la retraite dans les 5 prochaines années.`;
    return `${pct}% des employés ont plus de 55 ans. La pyramide des âges reste relativement équilibrée.`;
  })();

  // Category analysis text
  const categoryAnalysis = (() => {
    if (categoryStats.length === 0) return "";
    const top = categoryStats[0];
    return `L'institution est composée majoritairement de personnel de la catégorie "${top.name}" représentant ${top.percent}% des effectifs.`;
  })();

  // Cross analysis text
  const crossAnalysis = (() => {
    const seniorLeaders = employees.filter(e => e.seniority !== null && e.seniority >= 20 && e.age !== null && e.age >= 50).length;
    if (seniorLeaders > 0) return `${seniorLeaders} employé(s) cumulent plus de 20 ans d'ancienneté et plus de 50 ans d'âge, ce qui expose l'institution à une perte de mémoire organisationnelle à moyen terme.`;
    return "L'analyse croisée ne révèle pas de concentration critique de risques à court terme.";
  })();

  const handleExportPdf = () => {
    exportToPdf("staff-status-report", `rapport-etat-personnel-${format(now, "yyyy-MM-dd")}`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const SectionTitle = ({ num, title }: { num: string; title: string }) => (
    <div className="mt-8 mb-4">
      <h2 className="text-xl font-bold text-primary">{num}. {title}</h2>
      <Separator className="mt-2" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Controls - not exported */}
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <Button onClick={handleExportPdf} variant="outline"><FileDown className="h-4 w-4 mr-2" />Exporter PDF</Button>
        <Button onClick={handlePrint} variant="outline"><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
      </div>

      {/* Editable fields - not in PDF */}
      <Card className="print:hidden">
        <CardContent className="p-4 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Paramètres du rapport</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Période</label>
              <Input value={period} onChange={e => setPeriod(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Titre du rapport</label>
              <Input value={reportTitle} onChange={e => setReportTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Nom du rédacteur</label>
              <Input value={redactorName} onChange={e => setRedactorName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Fonction du rédacteur</label>
              <Input value={redactorTitle} onChange={e => setRedactorTitle(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Document */}
      <ScrollArea className="h-[70vh] print:h-auto print:overflow-visible">
        <div id="staff-status-report" className="bg-white text-black mx-auto shadow-lg print:shadow-none print:max-w-none" style={{ fontFamily: "Georgia, serif", fontSize: "13px", lineHeight: "1.7", width: "215.9mm", maxWidth: "215.9mm" }}>

          {/* 1. PAGE DE GARDE */}
          <div data-pdf-section className="text-center space-y-6 border-b-2 border-primary flex flex-col items-center justify-center" style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", minHeight: "279.4mm", boxSizing: "border-box", pageBreakAfter: "always" }}>
            <p className="text-lg font-semibold uppercase tracking-wide">{orgName}</p>
            <p className="text-sm text-muted-foreground">Direction des Ressources Humaines</p>
            <div className="py-8">
              <h1 className="text-3xl font-bold uppercase tracking-wider">{reportTitle}</h1>
            </div>
            <p className="text-base">{period}</p>
            <div className="pt-12 space-y-1">
              <p className="text-sm">Date de rédaction : {format(now, "dd MMMM yyyy", { locale: fr })}</p>
              <p className="text-sm">Rédigé par : {redactorName}</p>
              <p className="text-sm italic">{redactorTitle}</p>
            </div>
          </div>

          {/* 2. INTRODUCTION + 3. EFFECTIF GLOBAL */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", pageBreakAfter: "always" }}>
            <SectionTitle num="1" title="Introduction" />
            <div className="space-y-2">
              <textarea
                value={introText}
                onChange={e => { setIntroText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
                style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "80px" }}
              />
            </div>

            <SectionTitle num="2" title="Effectif global" />
            <p className="font-semibold mb-2">Tableau 1 – Répartition par catégorie</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Catégorie</TableHead>
                  <TableHead className="text-black font-bold text-center">Nombre</TableHead>
                  <TableHead className="text-black font-bold text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoryStats.map(cat => (
                  <TableRow key={cat.name}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell className="text-center">{cat.count}</TableCell>
                    <TableCell className="text-center">{cat.percent}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/20">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{total}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{categoryAnalysis}</p>

            <p className="font-semibold mb-2 mt-6">Tableau 2 – Répartition par statut</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Statut</TableHead>
                  <TableHead className="text-black font-bold text-center">Nombre</TableHead>
                  <TableHead className="text-black font-bold text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statusStats.map(s => (
                  <TableRow key={s.name}>
                    <TableCell>{s.name}</TableCell>
                    <TableCell className="text-center">{s.count}</TableCell>
                    <TableCell className="text-center">{s.percent}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/20">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{total}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{statusAnalysis}</p>

            <p className="font-semibold mb-2 mt-6">Tableau 3 – Répartition par sexe</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Sexe</TableHead>
                  <TableHead className="text-black font-bold text-center">Nombre</TableHead>
                  <TableHead className="text-black font-bold text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {genderStats.map(g => (
                  <TableRow key={g.name}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className="text-center">{g.count}</TableCell>
                    <TableCell className="text-center">{g.percent}%</TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/20">
                  <TableCell>Total</TableCell>
                  <TableCell className="text-center">{total}</TableCell>
                  <TableCell className="text-center">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{genderAnalysis}</p>
          </div>

          {/* 4. PARCOURS PROFESSIONNEL */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", pageBreakAfter: "always" }}>
            <SectionTitle num="3" title="Parcours professionnel des employés" />
            <p className="font-semibold mb-2">Tableau 4 – Situation professionnelle actuelle</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Nom</TableHead>
                  <TableHead className="text-black font-bold">Poste actuel</TableHead>
                  <TableHead className="text-black font-bold">Unité</TableHead>
                  <TableHead className="text-black font-bold text-center">Statut</TableHead>
                  <TableHead className="text-black font-bold text-center">Sexe</TableHead>
                  <TableHead className="text-black font-bold text-center">Année d'entrée</TableHead>
                  <TableHead className="text-black font-bold text-center">Ancienneté</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.sort((a, b) => (b.seniority ?? 0) - (a.seniority ?? 0)).map(emp => (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.fullName}</TableCell>
                    <TableCell>{emp.positionName}</TableCell>
                    <TableCell>{emp.unitName}</TableCell>
                    <TableCell className="text-center">{emp.employmentType === "permanent" ? "Permanent" : emp.employmentType === "contractuel" ? "Contractuel" : emp.employmentType === "professeur" ? "Professeur" : emp.employmentType === "journalier" ? "Journalier" : emp.employmentType}</TableCell>
                    <TableCell className="text-center">{emp.sexe === "M" ? "M" : emp.sexe === "F" ? "F" : "NR"}</TableCell>
                    <TableCell className="text-center">{emp.dateEntree ? format(new Date(emp.dateEntree), "yyyy") : "N/A"}</TableCell>
                    <TableCell className="text-center">{emp.seniority !== null ? `${emp.seniority} ans` : "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* 5. ANCIENNETÉ + 6. ANALYSE PAR ÂGE */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", pageBreakAfter: "always" }}>
            <SectionTitle num="4" title="Ancienneté du personnel" />
            <p className="font-semibold mb-2">Tableau 5 – Répartition par ancienneté</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Tranche d'ancienneté</TableHead>
                  <TableHead className="text-black font-bold text-center">Nombre</TableHead>
                  <TableHead className="text-black font-bold text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {seniorityBuckets.map(b => (
                  <TableRow key={b.label}>
                    <TableCell>{b.label}</TableCell>
                    <TableCell className="text-center">{b.count}</TableCell>
                    <TableCell className="text-center">{b.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{seniorityAnalysis}</p>

            <SectionTitle num="5" title="Analyse par âge" />
            <p className="font-semibold mb-2">Tableau 6 – Répartition par âge</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Tranche d'âge</TableHead>
                  <TableHead className="text-black font-bold text-center">Nombre</TableHead>
                  <TableHead className="text-black font-bold text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ageBuckets.map(b => (
                  <TableRow key={b.label}>
                    <TableCell>{b.label}</TableCell>
                    <TableCell className="text-center">{b.count}</TableCell>
                    <TableCell className="text-center">{b.percent}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{ageAnalysis}</p>
          </div>

          {/* 7. ANALYSE CROISÉE */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", pageBreakAfter: "always" }}>
            <SectionTitle num="6" title="Analyse croisée" />
            <p className="font-semibold mb-2">Tableau 7 – Matrice Âge × Ancienneté</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-black font-bold">Âge \ Ancienneté</TableHead>
                  {senRangeHeaders.map(h => <TableHead key={h} className="text-black font-bold text-center">{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossAgeSeniority.map(row => (
                  <TableRow key={row.ageLabel}>
                    <TableCell className="font-medium">{row.ageLabel}</TableCell>
                    {row.values.map((v, i) => <TableCell key={i} className="text-center">{v || "-"}</TableCell>)}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 italic text-muted-foreground">{crossAnalysis}</p>
          </div>

          {/* 8. PROBLÈMES + 9. RECOMMANDATIONS */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm", pageBreakAfter: "always" }}>
            <SectionTitle num="7" title="Problèmes identifiés" />
            <textarea
              value={problemsText}
              onChange={e => { setProblemsText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
              style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "80px" }}
            />

            <SectionTitle num="8" title="Recommandations" />
            <div className="space-y-4">
              <div>
                <p className="font-semibold mb-1">Court terme</p>
                <textarea
                  value={recoCourtTerme}
                  onChange={e => { setRecoCourtTerme(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
                  style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "60px" }}
                />
              </div>
              <div>
                <p className="font-semibold mb-1">Moyen terme</p>
                <textarea
                  value={recoMoyenTerme}
                  onChange={e => { setRecoMoyenTerme(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
                  style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "60px" }}
                />
              </div>
              <div>
                <p className="font-semibold mb-1">Long terme</p>
                <textarea
                  value={recoLongTerme}
                  onChange={e => { setRecoLongTerme(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
                  ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                  className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
                  style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "60px" }}
                />
              </div>
            </div>
          </div>

          {/* 10. CONCLUSION */}
          <div data-pdf-section style={{ paddingLeft: "2.5cm", paddingRight: "2.5cm", paddingBottom: "2.5cm", paddingTop: "2cm" }}>
            <SectionTitle num="9" title="Conclusion" />
            <textarea
              value={conclusionText}
              onChange={e => { setConclusionText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
              className="flex w-full rounded-md border border-dashed bg-transparent px-3 py-2 text-sm text-black print:border-none print:p-0 print:resize-none whitespace-pre-wrap break-words overflow-hidden resize-none"
              style={{ fontFamily: "inherit", fontSize: "inherit", lineHeight: "inherit", minHeight: "80px" }}
            />

            <div className="pt-12 mt-8 border-t text-center text-xs text-muted-foreground">
              <p>Document généré le {format(now, "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
              <p>{orgName} — Direction des Ressources Humaines</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
