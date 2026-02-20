import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Loader2, MessageSquare, RefreshCw, Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ReportAnalysisProps {
  reportType: string;
  reportData: Record<string, any>;
  organizationName: string;
}

export const ReportAnalysis = ({ reportType, reportData, organizationName }: ReportAnalysisProps) => {
  const [aiAnalysis, setAiAnalysis] = useState<string>("");
  const [userComment, setUserComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-report", {
        body: { reportType, reportData, organizationName },
      });

      if (error) throw error;
      if (data?.error) {
        toast({ title: "Erreur", description: data.error, variant: "destructive" });
        return;
      }

      setAiAnalysis(data.analysis);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer l'analyse. Réessayez plus tard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    const fullText = [aiAnalysis, userComment ? `\n\n--- Commentaires ---\n${userComment}` : ""].join("");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Analyse & Commentaires</CardTitle>
          </div>
          <div className="flex gap-2">
            {aiAnalysis && (
              <Button variant="ghost" size="sm" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            )}
            <Button
              onClick={generateAnalysis}
              disabled={loading}
              size="sm"
              variant={aiAnalysis ? "outline" : "default"}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : aiAnalysis ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              {loading ? "Analyse en cours..." : aiAnalysis ? "Régénérer" : "Générer l'analyse IA"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiAnalysis && (
          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Analyse IA</span>
            </div>
            <ScrollArea className="max-h-[400px]">
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                {aiAnalysis}
              </div>
            </ScrollArea>
          </div>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Vos commentaires et observations</span>
          </div>
          <Textarea
            value={userComment}
            onChange={(e) => setUserComment(e.target.value)}
            placeholder="Ajoutez vos propres commentaires, observations ou analyses complémentaires..."
            className="min-h-[100px] resize-y"
          />
        </div>
      </CardContent>
    </Card>
  );
};
