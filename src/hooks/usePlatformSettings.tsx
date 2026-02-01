import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface OwnershipInfo {
  company_name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

export const usePlatformSettings = () => {
  const queryClient = useQueryClient();

  const { data: ownershipInfo, isLoading } = useQuery({
    queryKey: ["platform-settings", "ownership_info"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("platform_settings")
        .select("*")
        .eq("setting_key", "ownership_info")
        .single();

      if (error) throw error;
      return data?.setting_value as unknown as OwnershipInfo;
    },
  });

  const updateOwnershipInfo = useMutation({
    mutationFn: async (newInfo: OwnershipInfo) => {
      const jsonValue: Json = {
        company_name: newInfo.company_name,
        email: newInfo.email,
        phone: newInfo.phone,
        address: newInfo.address,
        description: newInfo.description,
      };
      
      const { error } = await supabase
        .from("platform_settings")
        .update({ setting_value: jsonValue })
        .eq("setting_key", "ownership_info");

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
    },
  });

  return {
    ownershipInfo,
    isLoading,
    updateOwnershipInfo,
  };
};
