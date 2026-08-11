import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Camera, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhotoUploadProps {
  value?: string;
  onChange: (url: string) => void;
  userId: string;
  /** Affiche l'option « Prendre une photo » avec la caméra (par défaut : true) */
  allowCapture?: boolean;
}

export function PhotoUpload({ value, onChange, userId, allowCapture = true }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const uploadBlob = async (blob: Blob, ext: string) => {
    setUploading(true);
    try {
      const fileName = `${userId}/${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage
        .from("profile-photos")
        .upload(fileName, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: blob.type || `image/${ext}`,
        });

      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from("profile-photos").getPublicUrl(data.path);

      setPreview(publicUrl);
      onChange(publicUrl);

      toast({ title: "Succès", description: "Photo enregistrée avec succès" });
      return true;
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors du téléchargement de la photo",
        variant: "destructive",
      });
      return false;
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une image",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Erreur",
        description: "L'image doit faire moins de 5 Mo",
        variant: "destructive",
      });
      return;
    }

    await uploadBlob(file, file.name.split(".").pop() || "jpg");
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  };

  const startCamera = async (mode: "user" | "environment") => {
    setCameraError(null);
    setCameraReady(false);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
    } catch (e) {
      console.error("Camera error:", e);
      setCameraError(
        "Impossible d'accéder à la caméra. Vérifiez les autorisations du navigateur, ou téléchargez une image."
      );
    }
  };

  useEffect(() => {
    if (cameraOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraOpen, facingMode]);

  const handleCapture = async () => {
    const video = videoRef.current;
    if (!video) return;

    const size = Math.min(video.videoWidth, video.videoHeight);
    if (!size) return;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      size,
      size
    );

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.9)
    );
    if (!blob) return;

    const ok = await uploadBlob(blob, "jpg");
    if (ok) setCameraOpen(false);
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative inline-block">
          <img
            src={preview}
            alt="Photo de profil"
            className="w-32 h-32 rounded-full object-cover border-4 border-border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full"
            onClick={handleRemove}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="w-32 h-32 rounded-full border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors"
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Téléchargement...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {preview ? "Changer la photo" : "Télécharger une photo"}
            </>
          )}
        </Button>

        {allowCapture && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCameraOpen(true)}
            disabled={uploading}
            className="flex-1"
          >
            <Camera className="mr-2 h-4 w-4" />
            Prendre une photo
          </Button>
        )}
      </div>

      <Dialog open={cameraOpen} onOpenChange={setCameraOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Prendre une photo</DialogTitle>
            <DialogDescription>
              Cadrez votre visage puis capturez. La photo sera recadrée en carré.
            </DialogDescription>
          </DialogHeader>

          {cameraError ? (
            <p className="text-sm text-destructive">{cameraError}</p>
          ) : (
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className="h-full w-full object-cover"
              />
              {!cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setFacingMode((m) => (m === "user" ? "environment" : "user"))}
              disabled={uploading || !!cameraError}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Caméra
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={handleCapture}
              disabled={uploading || !cameraReady}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Capturer
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
