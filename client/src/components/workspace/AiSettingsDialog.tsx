import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Check, EyeOff, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AiSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AiSettingsDialog({ open, onOpenChange }: AiSettingsDialogProps) {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.aiSettings.get.useQuery(undefined, { enabled: open });
  const modelsQuery = trpc.ai.models.useQuery(undefined, { enabled: open && Boolean(settingsQuery.data?.hasApiKey && settingsQuery.data?.baseUrl) });
  const saveMutation = trpc.aiSettings.save.useMutation({
    onSuccess: async () => {
      await utils.aiSettings.get.invalidate();
      await modelsQuery.refetch();
      toast.success("AI settings saved securely.");
    },
    onError: error => toast.error(error.message),
  });
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  useEffect(() => {
    if (!settingsQuery.data) return;
    setBaseUrl(settingsQuery.data.baseUrl ?? "");
    setSelectedModel(settingsQuery.data.selectedModel ?? "");
  }, [settingsQuery.data]);

  const save = () => {
    if (!baseUrl.trim()) {
      toast.error("Enter the OpenCode-compatible base URL.");
      return;
    }
    saveMutation.mutate({
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim() || undefined,
      selectedModel: selectedModel || undefined,
    });
    setApiKey("");
  };

  const models = modelsQuery.data?.models ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/[0.12] bg-[#151619] p-0 text-white shadow-2xl">
        <DialogHeader className="border-b border-white/[0.08] px-5 py-5">
          <DialogTitle className="flex items-center gap-2.5 text-base"><span className="flex size-8 items-center justify-center rounded-lg bg-white/[0.08]"><ShieldCheck className="size-4 text-white/80" /></span>AI configuration</DialogTitle>
          <DialogDescription className="pt-1 text-xs leading-5 text-white/48">The base URL and key are stored server-side only. The browser receives only the masked key state.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 px-5 py-5">
          <div className="space-y-2"><Label htmlFor="opencode-base-url" className="text-xs text-white/72">OpenCode-compatible base URL</Label><Input id="opencode-base-url" value={baseUrl} onChange={event => setBaseUrl(event.target.value)} placeholder="https://your-service.example/v1" className="border-white/[0.12] bg-black/20 text-sm text-white placeholder:text-white/28 focus-visible:ring-white/35" /></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="opencode-api-key" className="text-xs text-white/72">API key</Label>{settingsQuery.data?.keyMask ? <span className="flex items-center gap-1 text-[10px] text-white/42"><EyeOff className="size-3" />Stored: {settingsQuery.data.keyMask}</span> : null}</div><Input id="opencode-api-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder={settingsQuery.data?.hasApiKey ? "Leave blank to keep the stored key" : "Paste API key"} className="border-white/[0.12] bg-black/20 text-sm text-white placeholder:text-white/28 focus-visible:ring-white/35" /></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label className="text-xs text-white/72">Model</Label><Button variant="ghost" size="sm" onClick={() => void modelsQuery.refetch()} disabled={modelsQuery.isFetching || !settingsQuery.data?.hasApiKey} className="h-6 px-1.5 text-[10px] text-white/48 hover:bg-white/[0.07] hover:text-white"><RefreshCw className={modelsQuery.isFetching ? "mr-1 size-3 animate-spin" : "mr-1 size-3"} />Refresh catalog</Button></div><Select value={selectedModel} onValueChange={setSelectedModel} disabled={!models.length}><SelectTrigger className="border-white/[0.12] bg-black/20 text-sm text-white focus:ring-white/35"><SelectValue placeholder={settingsQuery.data?.hasApiKey ? "Save settings, then refresh models" : "Add a key to retrieve models"} /></SelectTrigger><SelectContent className="border-white/[0.12] bg-[#1b1c1f] text-white">{models.map(model => <SelectItem key={model.id} value={model.id} className="text-xs focus:bg-white/[0.1] focus:text-white">{model.id}{model.freeTagged ? " · free-tagged" : ""}</SelectItem>)}</SelectContent></Select></div>
          <div className="rounded-lg border border-white/[0.08] bg-black/20 px-3 py-2.5 text-[11px] leading-5 text-white/48">Model discovery and chat calls are proxied from the server. Your configured key is never returned to the application client or written to normal logs.</div>
        </div>
        <div className="flex justify-end gap-2 border-t border-white/[0.08] px-5 py-4"><Button variant="ghost" onClick={() => onOpenChange(false)} className="h-8 text-xs text-white/60 hover:bg-white/[0.08] hover:text-white">Cancel</Button><Button onClick={save} disabled={saveMutation.isPending || settingsQuery.isLoading} className="h-8 bg-white px-3 text-xs font-semibold text-black hover:bg-white/90">{saveMutation.isPending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Check className="mr-1.5 size-3.5" />}Save configuration</Button></div>
      </DialogContent>
    </Dialog>
  );
}
