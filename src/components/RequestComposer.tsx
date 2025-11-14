import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Play, Users, ChevronDown, ChevronUp, AlertCircle, Lock } from "lucide-react";
import { EXAMPLE_PROMPTS, AGENCY_EXAMPLE_PROMPTS } from "@/constants/examplePrompts";
import { useTranslation } from "react-i18next";
import { useWorkflowDefinitions } from "@/hooks/useWorkflowDefinitions";
import { useSessionStore } from "@/state/sessionStore";
import { agentOSConfig } from "@/lib/env";

type Translate = (key: string, options?: Record<string, unknown>) => string;

const createRequestSchema = (t: Translate) =>
  z.object({
    input: z.string().min(1, t("requestComposer.validation.inputRequired")),
    workflowId: z.string().optional()
  });

export type RequestComposerPayload = z.infer<ReturnType<typeof createRequestSchema>>;

interface RequestComposerProps {
  onSubmit: (payload: RequestComposerPayload) => void;
  disabled?: boolean;
}

export function RequestComposer({ onSubmit, disabled = false }: RequestComposerProps) {
  const { t } = useTranslation();
  const [isStreaming, setStreaming] = useState(false);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const sessions = useSessionStore((state) => state.sessions);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const { data: workflowDefinitions = [] } = useWorkflowDefinitions();

  const activeSession = sessions.find((item) => item.id === activeSessionId) ?? null;


  const samplePrompt = t("requestComposer.defaults.samplePrompt");
  const examplePrompts = useMemo(() => {
    // Use agency-specific prompts if agency session is active
    const source = activeSession?.targetType === 'agency' ? AGENCY_EXAMPLE_PROMPTS : EXAMPLE_PROMPTS;
    const arr = [...source];
    // Fisher-Yates shuffle (partial is fine)
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const count = Math.random() < 0.5 ? 3 : 4;
    return arr.slice(0, count);
  }, [activeSession?.targetType]);
  const requestSchema = useMemo(() => createRequestSchema(t), [t]);

  const form = useForm<RequestComposerPayload>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      input: examplePrompts[0] || samplePrompt || "Hi"
    }
  });

  const { errors } = form.formState;

  // Remove all the complex form logic - session determines the target

  useEffect(() => {
    if (isStreaming && activeSession && activeSession.status !== "streaming") {
      setStreaming(false);
    }
  }, [activeSession, isStreaming]);

  // Remove unused options - session determines target

  const processSubmission = (values: RequestComposerPayload) => {
    if (!activeSession) {
      console.error("No active session selected");
      return;
    }

    setStreaming(true);
    onSubmit(values);
    form.setValue("input", "");
    const promptSource = activeSession.targetType === "agency" ? AGENCY_EXAMPLE_PROMPTS : EXAMPLE_PROMPTS;
    const nextPrompt = promptSource[Math.floor(Math.random() * promptSource.length)];
    setTimeout(() => form.setValue("input", nextPrompt), 100);
  };

  const handleSubmit = form.handleSubmit(processSubmission);

  return (
    <div className="flex h-full flex-col gap-4 card-panel--strong p-6 transition-theme" data-tour="composer">
      <header>
        <p className="text-xs uppercase tracking-[0.25em] theme-text-muted">{t("requestComposer.header.title")}</p>
        <h2 className="text-lg font-semibold theme-text-primary">{t("requestComposer.header.subtitle")}</h2>
      </header>
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 transition-theme" aria-busy={isStreaming} aria-live="polite">
        <fieldset disabled={isStreaming || disabled}>
        {/* Single Action Constraint Info */}
        {isStreaming && activeSession && (
          <div className="flex items-start gap-2 rounded-lg theme-bg-warning p-2.5 text-xs">
            <Lock className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 theme-text-secondary" />
            <div>
              <p className="font-semibold theme-text-primary">Single Action Mode Active</p>
              <p className="mt-0.5 text-[11px] opacity-80">
                Persona sessions intentionally process one request at a time. Launch an Agency session when you need concurrent seats
                or parallel workflows.
              </p>
            </div>
          </div>
        )}
        
        {/* Session Info Display */}
        {activeSession && (
          <div className="rounded-xl border theme-border theme-bg-secondary-soft p-3 text-sm theme-text-secondary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider theme-text-muted">
                  {activeSession.targetType === 'agency' ? 'Agency Session' : 'Persona Session'}
                </p>
                <p className="font-medium theme-text-primary">{activeSession.displayName}</p>
              </div>
              {activeSession.targetType === 'agency' && (
                <Users className="h-4 w-4 theme-accent" />
              )}
            </div>
            {activeSession.targetType === 'agency' && workflowDefinitions.length > 0 && (
              <label className="mt-3 block space-y-1">
                <span className="text-xs theme-text-muted">Workflow (optional)</span>
                <select
                  {...form.register("workflowId")}
                  className="w-full rounded-lg border theme-border bg-[color:var(--color-background-secondary)] px-3 py-2 text-xs theme-text-primary focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  <option value="">No workflow</option>
                  {workflowDefinitions.map((workflow) => (
                    <option key={workflow.id} value={workflow.id}>
                      {workflow.displayName}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        <label className="flex flex-1 flex-col space-y-2 text-sm theme-text-secondary">
          {t("requestComposer.form.userInput.label")}
          {examplePrompts.length > 0 && (
            <div className="flex flex-wrap gap-x-1 gap-y-1 text-[10px] leading-tight">
              {examplePrompts.map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-2 py-0 text-[10px] transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  onClick={() => form.setValue('input', ex)}
                >
                  {ex}
                </button>
              ))}
            </div>
          )}
          <textarea
            rows={6}
            {...form.register("input")}
            onKeyDown={(e) => {
              if (isStreaming) return;
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void form.handleSubmit(processSubmission)();
              }
            }}
            className="flex-1 min-h-32 rounded-xl border theme-border bg-[color:var(--color-background-secondary)] px-3 py-2 text-base theme-text-primary placeholder:text-[color:var(--color-text-muted)] focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--color-background-primary)] transition-colors"
          />
          {errors.input && (
            <p className="text-xs text-[color:var(--error)]">{errors.input.message}</p>
          )}
        </label>



        <div className="mt-auto flex flex-col gap-3 text-xs theme-text-secondary">
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold theme-bg-accent theme-text-on-accent shadow-lg shadow-[rgba(15,23,42,0.15)] transition hover:-translate-y-0.5 hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStreaming}
          >
            <Play className="h-4 w-4" />
            {isStreaming ? t("requestComposer.actions.streaming") : t("requestComposer.actions.submit")}
          </button>
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setShowConnectionDetails(!showConnectionDetails)}
              className="flex items-start gap-2 text-xs theme-text-muted transition-colors hover:theme-text-primary"
            >
              <AlertCircle className="mt-0.5 h-3 w-3 theme-accent" />
              <span>{t("requestComposer.footer.localNotice")}</span>
              {showConnectionDetails ? (
                <ChevronUp className="mt-0.5 h-3 w-3" />
              ) : (
                <ChevronDown className="mt-0.5 h-3 w-3" />
              )}
            </button>
            {showConnectionDetails && (
              <div className="ml-5 rounded-lg border theme-border theme-bg-secondary-soft p-3 text-xs">
                <p className="mb-2 font-semibold theme-text-primary">Connection Status</p>
                <p className="mb-2">{t("requestComposer.footer.localNoticeDetails")}</p>
                <div className="mt-2 space-y-1 font-mono text-[10px] theme-text-secondary">
                  <div>
                    <span className="theme-text-muted">API Endpoint:</span>{" "}
                    <span className="theme-text-primary">{agentOSConfig.baseUrl}{agentOSConfig.streamPath}</span>
                  </div>
                  <div>
                    <span className="theme-text-muted">Storage:</span>{" "}
                    <span className="theme-text-primary">IndexedDB (browser local)</span>
                  </div>
                </div>
                <p className="mt-2 text-[color:var(--warning)]">
                  ⚠️ If requests fail, ensure your backend is running with <code className="px-1 py-0.5 rounded bg-[color:var(--color-background-secondary)] theme-text-primary">AGENTOS_ENABLED=true</code>
                </p>
              </div>
            )}
          </div>
        </div>
        </fieldset>
      </form>
    </div>
  );
}
