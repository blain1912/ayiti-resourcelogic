import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <h1 className="mb-4 text-4xl font-bold">Bienvenue sur votre Application</h1>
        <p className="text-xl text-muted-foreground">Commencez par vous connecter ou créer un compte</p>
        <Link to="/auth">
          <Button size="lg" className="mt-4">
            Se connecter / S'inscrire
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default Index;
