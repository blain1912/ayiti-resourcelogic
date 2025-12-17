import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface OrganizationTheme {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
}

interface OrganizationThemeContextType {
  organization: OrganizationTheme | null;
  loading: boolean;
  isCustomDomain: boolean;
}

const OrganizationThemeContext = createContext<OrganizationThemeContextType>({
  organization: null,
  loading: true,
  isCustomDomain: false,
});

export const useOrganizationTheme = () => useContext(OrganizationThemeContext);

// Convert hex color to HSL
function hexToHSL(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyOrganizationColors(org: OrganizationTheme) {
  const root = document.documentElement;
  
  if (org.primary_color) {
    const primaryHSL = hexToHSL(org.primary_color);
    root.style.setProperty('--primary', primaryHSL);
    root.style.setProperty('--ring', primaryHSL);
  }
  
  if (org.secondary_color) {
    const secondaryHSL = hexToHSL(org.secondary_color);
    root.style.setProperty('--secondary', secondaryHSL);
  }
  
  if (org.accent_color) {
    const accentHSL = hexToHSL(org.accent_color);
    root.style.setProperty('--accent', accentHSL);
  }
}

function resetColors() {
  const root = document.documentElement;
  root.style.removeProperty('--primary');
  root.style.removeProperty('--secondary');
  root.style.removeProperty('--accent');
  root.style.removeProperty('--ring');
}

export function OrganizationThemeProvider({ children }: { children: ReactNode }) {
  const [organization, setOrganization] = useState<OrganizationTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCustomDomain, setIsCustomDomain] = useState(false);

  useEffect(() => {
    const detectOrganization = async () => {
      try {
        let currentDomain = window.location.hostname;
        currentDomain = currentDomain.replace(/^www\./, '');
        
        const isPreviewDomain = currentDomain.includes('lovable.app') || 
                                currentDomain.includes('lovableproject.com') ||
                                currentDomain.includes('localhost') ||
                                currentDomain.includes('127.0.0.1');
        
        if (isPreviewDomain) {
          setIsCustomDomain(false);
          setLoading(false);
          return;
        }

        // Check if this domain corresponds to an organization
        const { data: orgByDomain, error } = await supabase
          .from("organizations")
          .select("id, name, logo_url, primary_color, secondary_color, accent_color")
          .eq("custom_domain", currentDomain)
          .eq("approval_status", "approved")
          .maybeSingle();
        
        if (error) {
          console.error("Error detecting organization theme:", error);
          setLoading(false);
          return;
        }
        
        if (orgByDomain) {
          setOrganization(orgByDomain);
          setIsCustomDomain(true);
          applyOrganizationColors(orgByDomain);
        } else {
          setIsCustomDomain(false);
          resetColors();
        }
      } catch (error) {
        console.error("Error in organization theme detection:", error);
      } finally {
        setLoading(false);
      }
    };

    detectOrganization();

    // Cleanup on unmount
    return () => {
      resetColors();
    };
  }, []);

  return (
    <OrganizationThemeContext.Provider value={{ organization, loading, isCustomDomain }}>
      {children}
    </OrganizationThemeContext.Provider>
  );
}
