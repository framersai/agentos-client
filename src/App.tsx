import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { SkipLink } from "@/components/SkipLink";
import { Sidebar } from "@/components/Sidebar";
import { SessionInspector } from "@/components/SessionInspector";
import { RequestComposer, type RequestComposerPayload } from "@/components/RequestComposer";
import { AgencyComposer } from "@/components/AgencyComposer";
import { AgencyManager } from "@/components/AgencyManager";
import { PersonaCatalog } from "@/components/PersonaCatalog";
import { WorkflowOverview } from "@/components/WorkflowOverview";
import { openAgentOSStream, getAvailableModels, type AgentRoleConfig, type AgentOSModelInfo } from "@/lib/agentosClient";
import { bootstrapStorage, persistSessionEventRow, persistSessionRow } from "@/lib/storageBridge";
import { TourOverlay } from "@/components/TourOverlay";
import { ThemePanel } from "@/components/ThemePanel";
import { AboutPanel } from "@/components/AboutPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ImportWizard } from "@/components/ImportWizard";
import { useUiStore } from "@/state/uiStore";
import { usePersonas } from "@/hooks/usePersonas";
import { useSystemTheme } from "@/hooks/useSystemTheme";
import { useSessionStore, type AgentSession, type SessionEvent, type SessionUpdate } from "@/state/sessionStore";
import { useTelemetryStore } from "@/state/telemetryStore";
import { Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

function TelemetryView() {
  const perSession = useTelemetryStore((s) => s.perSession);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const m = activeSessionId ? perSession[activeSessionId] : undefined;
  if (!m) return <p className="text-xs theme-text-secondary">No telemetry yet.</p>;
  return (
    <dl className="grid grid-cols-2 gap-3 text-xs theme-text-secondary">
      <div><dt className="uppercase tracking-widest theme-text-muted">Chunks</dt><dd className="font-semibold theme-text-primary">{m.chunks ?? 0}</dd></div>
      <div><dt className="uppercase tracking-widest theme-text-muted">Chars</dt><dd className="font-semibold theme-text-primary">{m.textDeltaChars ?? 0}</dd></div>
      <div><dt className="uppercase tracking-widest theme-text-muted">Tool calls</dt><dd className="font-semibold theme-text-primary">{m.toolCalls ?? 0}</dd></div>
      <div><dt className="uppercase tracking-widest theme-text-muted">Errors</dt><dd className="font-semibold theme-text-primary">{m.errors ?? 0}</dd></div>
      <div><dt className="uppercase tracking-widest theme-text-muted">Duration</dt><dd className="font-semibold theme-text-primary">{m.durationMs ? `${Math.round(m.durationMs)}ms` : '-'}</dd></div>
      <div><dt className="uppercase tracking-widest theme-text-muted">Tokens</dt><dd className="font-semibold theme-text-primary">{m.finalTokensTotal ?? '-'}</dd></div>
    </dl>
  );
}

function AnalyticsView({
  selectedModel,
  onChangeModel,
  modelOptions,
  modelData
}: {
  selectedModel?: string;
  onChangeModel: (model?: string) => void;
  modelOptions: string[];
  modelData: AgentOSModelInfo[];
}) {
  const perSession = useTelemetryStore((s) => s.perSession);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);
  const m = activeSessionId ? perSession[activeSessionId] : undefined;
  const tokens = m?.finalTokensTotal ?? 0;
  const promptTokens = m?.finalTokensPrompt ?? 0;
  const completionTokens = m?.finalTokensCompletion ?? 0;
  
  const currentModelData = modelData.find(model => model.id === selectedModel);
  const systemDefaultModel = modelData.find(model => model.id === 'gpt-4o-mini') || modelData[0];
  
  const estimateUsd = (promptTokens: number, completionTokens: number, model?: string) => {
    const modelInfo = modelData.find(m => m.id === model);
    const inputRate = modelInfo?.pricing?.inputCostPer1K ?? 0.0005;
    const outputRate = modelInfo?.pricing?.outputCostPer1K ?? 0.0015;
    const inputCost = (promptTokens / 1000) * inputRate;
    const outputCost = (completionTokens / 1000) * outputRate;
    return inputCost + outputCost;
  };
  
  const cost = estimateUsd(promptTokens, completionTokens, selectedModel);
  
  return (
    <div className="text-xs theme-text-secondary">
      <div className="mb-3 space-y-2">
        <label className="block">
          <span className="text-[11px] uppercase tracking-widest theme-text-muted">Model Override</span>
          <select
            value={selectedModel || ''}
            onChange={(e) => onChangeModel(e.target.value || undefined)}
            className="w-full rounded-md border theme-border bg-[color:var(--color-background-secondary)] px-2 py-1 text-xs theme-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <option value="">
              System default ({systemDefaultModel?.displayName || systemDefaultModel?.id || 'gpt-4o-mini'})
            </option>
            {modelOptions.map((m) => {
              const modelInfo = modelData.find(model => model.id === m);
              return (
                <option key={m} value={m}>
                  {modelInfo?.displayName || m} {selectedModel === m ? '(current)' : ''}
                </option>
              );
            })}
          </select>
        </label>
        {currentModelData && (
          <div className="text-[10px] theme-text-muted">
            Provider: {currentModelData.provider} | 
            Input: ${(currentModelData.pricing?.inputCostPer1K || 0).toFixed(4)}/1K | 
            Output: ${(currentModelData.pricing?.outputCostPer1K || 0).toFixed(4)}/1K
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p>Last session tokens: {tokens || '-'}</p>
        <p>Prompt: {promptTokens || '-'} | Completion: {completionTokens || '-'}</p>
        <p>Estimated cost: {tokens ? `$${cost.toFixed(4)}` : '-'}</p>
      </div>
    </div>
  );
}
import {
  AgentOSChunkType,
  type AgentOSAgencyUpdateChunk,
  type AgentOSWorkflowUpdateChunk
} from "@/types/agentos";

const DEFAULT_PERSONA_ID = "v_researcher";
const DEMO_PERSONA_SESSION_ID = "demo-persona-session";
const DEMO_AGENCY_ID = "demo-agency";
const DEMO_AGENCY_SESSION_ID = "demo-agency-session";

export default function App() {
  const LEFT_TABS = [
    { key: "compose", label: "Compose" },
    { key: "personas", label: "Personas" },
    { key: "agency", label: "Agency" },
    { key: "workflows", label: "Workflows" }
  ] as const;
  type LeftTabKey = typeof LEFT_TABS[number]["key"];
  const preferredLeftPanel = useUiStore((s) => s.preferredLeftPanel) as LeftTabKey | undefined;
  const setPreferredLeftPanel = useUiStore((s) => s.setPreferredLeftPanel);
  const leftTab: LeftTabKey = LEFT_TABS.some((tab) => tab.key === preferredLeftPanel)
    ? (preferredLeftPanel as LeftTabKey)
    : "personas";
  const setLeftTab = useCallback((key: LeftTabKey) => {
    setPreferredLeftPanel(key);
  }, [setPreferredLeftPanel]);
  const [showTour, setShowTour] = useState(false);
  const [showThemePanel, setShowThemePanel] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [modelData, setModelData] = useState<AgentOSModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
  const welcomeTourDismissed = useUiStore((s) => s.welcomeTourDismissed);
  const welcomeTourSnoozeUntil = useUiStore((s) => s.welcomeTourSnoozeUntil);
  const dismissWelcomeTour = useUiStore((s) => s.dismissWelcomeTour);
  const snoozeWelcomeTour = useUiStore((s) => s.snoozeWelcomeTour);
  const tourSteps = [
    { selector: '[data-tour="tabs"]', title: 'Panels', body: 'Switch between Compose, Agency, Personas, Workflows, Settings, and About.' },
    { selector: '[data-tour="composer"]', title: 'Compose', body: 'Write prompts, select persona/agency, and submit to start a session.' },
    { selector: '[data-tour="agency-manager"]', title: 'Agency', body: 'Define multi-seat collectives and attach workflows.' },
    { selector: '[data-tour="theme-button"]', title: 'Theme', body: 'Switch theme mode, appearance, and palette (Sakura, Twilight, etc.)' },
    { selector: '[data-tour="import-button"]', title: 'Import', body: 'Import exported personas, agencies, and sessions from JSON.' },
  ];
  const { t } = useTranslation();
  useSystemTheme();
  const personas = useSessionStore((state) => state.personas);
  const addPersona = useSessionStore((state) => state.addPersona);
  const agencies = useSessionStore((state) => state.agencies);
  const sessions = useSessionStore((state) => state.sessions);
  const addAgency = useSessionStore((state) => state.addAgency);
  const applyAgencySnapshot = useSessionStore((state) => state.applyAgencySnapshot);
  const applyWorkflowSnapshot = useSessionStore((state) => state.applyWorkflowSnapshot);
  const setPersonas = useSessionStore((state) => state.setPersonas);
  const personaFilters = useSessionStore((state) => state.personaFilters);
  const remotePersonas = useMemo(() => personas.filter(p => p.source === 'remote'), [personas]);
  const upsertSession = useSessionStore((state) => state.upsertSession);
  const appendEvent = useSessionStore((state) => state.appendEvent);
  const activeSessionId = useSessionStore((state) => state.activeSessionId);
  const setActiveSession = useSessionStore((state) => state.setActiveSession);
  const syncSessionToStorage = useCallback((sessionId: string) => {
    const snapshot = useSessionStore.getState().sessions.find((item) => item.id === sessionId);
    if (snapshot) {
      void persistSessionRow(snapshot);
    }
  }, []);
  const syncEventToStorage = useCallback((sessionId: string, event: SessionEvent) => {
    const snapshot = useSessionStore.getState().sessions.find((item) => item.id === sessionId);
    if (snapshot) {
      void persistSessionEventRow(snapshot, event);
    }
  }, []);
  const commitSession = useCallback((update: SessionUpdate) => {
    upsertSession(update);
    syncSessionToStorage(update.id);
  }, [upsertSession, syncSessionToStorage]);
  const pushEvent = useCallback((sessionId: string, event: SessionEvent) => {
    appendEvent(sessionId, event);
    syncEventToStorage(sessionId, event);
  }, [appendEvent, syncEventToStorage]);
  
  const activeSession = useMemo(() => {
    return activeSessionId ? sessions.find(s => s.id === activeSessionId) : undefined;
  }, [activeSessionId, sessions]);
  const isAgencyStreaming = activeSession?.targetType === 'agency' && activeSession.status === 'streaming';

  const streamHandles = useRef<Record<string, () => void>>({});
  const telemetry = useTelemetryStore();
  const personasQuery = usePersonas({
    filters: {
      search: personaFilters.search.trim() ? personaFilters.search.trim() : undefined,
      capability: personaFilters.capabilities
    },
    staleTimeMs: 10 * 60 * 1000, // 10 minutes cache
  });

  const backendReady = !personasQuery.isLoading && !personasQuery.isError;

  useEffect(() => {
    if (!personasQuery.data) return;
    setPersonas(personasQuery.data);
  }, [personasQuery.data, setPersonas]);

  // Bootstrap persisted sessions/personas from the SQL storage adapter
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { sessions: storedSessions, personas: storedPersonas } = await bootstrapStorage();
        if (cancelled) return;
        if (storedPersonas.length > 0) {
          storedPersonas.forEach((persona) => addPersona(persona));
        }
        if (storedSessions.length > 0) {
          storedSessions.forEach((session) => upsertSession(session));
        }
      } catch (error) {
        console.error("[AgentOS Client] Failed to bootstrap storage", error);
      } finally {
        if (!cancelled) {
          setStorageReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addPersona, upsertSession]);

  // Fetch available models from AgentOS
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const models = await getAvailableModels();
        if (!mounted) return;
        const rawModels: AgentOSModelInfo[] = Array.isArray(models) ? (models as AgentOSModelInfo[]) : [];
        const normalisedModels = rawModels.map((model) => ({
          id: model.id ?? crypto.randomUUID(),
          displayName: model.displayName,
          provider: model.provider,
          pricing: model.pricing
        }));
        setModelData(normalisedModels);
        const modelIds = normalisedModels.map((m) => m.id);
        setModelOptions(modelIds);
      } catch {
        if (mounted) {
          setModelOptions([]);
          setModelData([]);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const preferDefaultPersona = useCallback((ids: string[]): string | undefined => {
    if (ids.includes('v_researcher')) return 'v_researcher';
    return ids[0];
  }, []);

  const ensureDemoPersonaSession = useCallback(() => {
    if (!storageReady) return;
    const hasDemo = sessions.some((session) => session.id === DEMO_PERSONA_SESSION_ID);
    const remoteIds = personas.filter((p) => p.source === "remote").map((p) => p.id);
    const personaId = preferDefaultPersona(remoteIds) ?? personas[0]?.id ?? null;
    if (!personaId) return;

    if (!hasDemo) {
      commitSession({
        id: DEMO_PERSONA_SESSION_ID,
        targetType: "persona",
        displayName: "Demo Persona Session",
        personaId,
        status: "idle",
        events: []
      });
    }

    if (!activeSessionId) {
      setActiveSession(DEMO_PERSONA_SESSION_ID);
    }
  }, [storageReady, sessions, personas, preferDefaultPersona, activeSessionId, commitSession, setActiveSession]);

  useEffect(() => {
    ensureDemoPersonaSession();
  }, [ensureDemoPersonaSession]);

  // Seed a demo agency if none exists, to make the dashboard usable immediately
  const ensureDemoAgencySession = useCallback(() => {
    if (!storageReady) return;
    const remotePersonas = personas.filter((p) => p.source === "remote");
    if (remotePersonas.length < 1) return;
    let demoAgency = agencies.find((agency) => agency.id === DEMO_AGENCY_ID) ?? null;
    if (!demoAgency) {
      const timestamp = new Date().toISOString();
      const participants = [
        { roleId: "lead", personaId: remotePersonas[0]?.id ?? DEFAULT_PERSONA_ID },
        { roleId: "researcher", personaId: remotePersonas[1]?.id ?? remotePersonas[0]?.id ?? DEFAULT_PERSONA_ID },
        { roleId: "writer", personaId: remotePersonas[0]?.id ?? DEFAULT_PERSONA_ID }
      ];
      const seededAgency = {
        id: DEMO_AGENCY_ID,
        name: "Demo Agency",
        goal: "Multi-GMI coordination demo",
        workflowId: undefined,
        participants,
        metadata: { seeded: true },
        createdAt: timestamp,
        updatedAt: timestamp
      };
      addAgency(seededAgency);
      demoAgency = seededAgency;
    }
    const hasDemoSession = sessions.some((session) => session.id === DEMO_AGENCY_SESSION_ID);
    if (!hasDemoSession && demoAgency) {
      commitSession({
        id: DEMO_AGENCY_SESSION_ID,
        targetType: "agency",
        displayName: demoAgency.name,
        agencyId: demoAgency.id,
        status: "idle",
        events: []
      });
    }
  }, [storageReady, agencies, personas, addAgency, commitSession, sessions]);

  useEffect(() => {
    ensureDemoAgencySession();
  }, [ensureDemoAgencySession]);

  useEffect(() => {
    if (personasQuery.error) {
      console.error("[AgentOS Client] Failed to load personas", personasQuery.error);
    }
  }, [personasQuery.error]);

  // Wire up a global event to open the import wizard from SettingsPanel
  useEffect(() => {
    const open = () => setShowImport(true);
    window.addEventListener('agentos:open-import', open as EventListener);
    return () => window.removeEventListener('agentos:open-import', open as EventListener);
  }, []);

  // Toggle Theme Panel via custom event
  useEffect(() => {
    const toggle = () => setShowThemePanel((v) => !v);
    window.addEventListener('agentos:toggle-theme-panel', toggle as EventListener);
    return () => window.removeEventListener('agentos:toggle-theme-panel', toggle as EventListener);
  }, []);

  // Toggle Tour Overlay via custom event
  useEffect(() => {
    const toggle = () => setShowTour((v) => !v);
    window.addEventListener('agentos:toggle-tour', toggle as EventListener);
    return () => window.removeEventListener('agentos:toggle-tour', toggle as EventListener);
  }, []);

  // Settings / About as modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  useEffect(() => {
    const openSettings = () => setShowSettingsModal(true);
    window.addEventListener('agentos:open-settings', openSettings as EventListener);
    return () => window.removeEventListener('agentos:open-settings', openSettings as EventListener);
  }, []);
  useEffect(() => {
    const openAbout = () => setShowAboutModal(true);
    window.addEventListener('agentos:open-about', openAbout as EventListener);
    return () => window.removeEventListener('agentos:open-about', openAbout as EventListener);
  }, []);

  // Responsive: track desktop vs mobile and auto-collapse sidebar on small screens
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)'); // md breakpoint
    const apply = (matches: boolean) => {
      setIsDesktop(matches);
      if (!matches) {
        setSidebarCollapsed(false); // sidebar visibility handled by mobile overlay
      }
    };
    apply(mq.matches);
    const handler = (e: MediaQueryListEvent) => apply(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Show welcome tour on first load unless dismissed or snoozed
  useEffect(() => {
    if (!welcomeTourDismissed) {
      const now = Date.now();
      if (!welcomeTourSnoozeUntil || now >= welcomeTourSnoozeUntil) {
        setShowTour(true);
      }
    }
  }, [welcomeTourDismissed, welcomeTourSnoozeUntil]);


  const resolvePersonaName = useCallback(
    (personaId?: string | null) => {
      if (!personaId) {
        return t("app.fallbacks.untitledPersona");
      }
      const persona = personas.find((item) => item.id === personaId);
      return persona?.displayName ?? personaId;
    },
    [personas, t]
  );

  const resolveAgencyName = useCallback(
    (agencyId?: string | null) => {
      if (!agencyId) {
        return t("app.fallbacks.agencyCollective");
      }
      const agency = agencies.find((item) => item.id === agencyId);
      return agency?.name ?? agencyId;
    },
    [agencies, t]
  );

  const ensureActiveSession = useCallback((): AgentSession => {
    if (activeSessionId) {
      const existing = sessions.find((session) => session.id === activeSessionId);
      if (existing) {
        return existing;
      }
    }

    const remoteIds = personas.filter((p) => p.source === "remote").map((p) => p.id);
    const personaId = preferDefaultPersona(remoteIds) ?? personas[0]?.id ?? DEFAULT_PERSONA_ID;
    const fallback: AgentSession = {
      id: crypto.randomUUID(),
      targetType: "persona",
      displayName: resolvePersonaName(personaId),
      personaId,
      status: "idle",
      events: []
    };
    commitSession(fallback);
    setActiveSession(fallback.id);
    return fallback;
  }, [activeSessionId, sessions, personas, preferDefaultPersona, resolvePersonaName, setActiveSession, commitSession]);

  const handleCreateSession = useCallback(
    (opts?: { targetType?: 'persona' | 'agency'; personaId?: string; agencyId?: string; displayName?: string }) => {
      const sessionId = crypto.randomUUID();
      const remoteIds = personas.filter((p) => p.source === "remote").map((p) => p.id);
      const fallbackPersonaId = preferDefaultPersona(remoteIds) ?? personas[0]?.id ?? DEFAULT_PERSONA_ID;
      const rawPersonaId = opts?.personaId?.trim();
      const personaId =
        rawPersonaId && personas.some((p) => p.id === rawPersonaId) ? rawPersonaId : fallbackPersonaId;
      const fallbackAgencyId = agencies[0]?.id;
      const rawAgencyId = opts?.agencyId?.trim();
      let targetType: 'persona' | 'agency' = opts?.targetType ?? "persona";
      const agencyId = targetType === "agency" ? (rawAgencyId || fallbackAgencyId) : undefined;
      if (targetType === "agency" && !agencyId) {
        targetType = "persona";
      }

      const baseName =
        targetType === "agency"
          ? resolveAgencyName(agencyId)
          : resolvePersonaName(personaId);
      const existing = sessions.filter((session) => session.displayName.startsWith(baseName)).length;
      const displayName =
        opts?.displayName ?? (existing === 0 ? baseName : `${baseName} ${existing + 1}`);

      commitSession({
        id: sessionId,
        targetType,
        displayName,
        personaId: targetType === "persona" ? personaId : undefined,
        agencyId: targetType === "agency" ? agencyId : undefined,
        status: "idle",
        events: []
      });
      setActiveSession(sessionId);
      return sessionId;
    },
    [agencies, personas, sessions, setActiveSession, commitSession, preferDefaultPersona, resolveAgencyName, resolvePersonaName]
  );

  const handleSubmit = useCallback(
    (payload: RequestComposerPayload) => {
      const session = ensureActiveSession();
      const sessionId = session.id;

      const remoteIds = personas.filter((p) => p.source === "remote").map((p) => p.id);
      const allPersonaIds = personas.map((p) => p.id);
      const preferredPersonaId = preferDefaultPersona(remoteIds) ?? personas[0]?.id ?? DEFAULT_PERSONA_ID;

      let effectiveTarget: 'persona' | 'agency' = session.targetType;
      let agencyId = session.agencyId ?? null;
      if (effectiveTarget === "agency") {
        if (agencyId && agencies.some((agency) => agency.id === agencyId)) {
          // valid agency
        } else if (agencies.length > 0) {
          agencyId = agencies[0]?.id ?? null;
        } else {
          effectiveTarget = "persona";
          agencyId = null;
        }
      }

      let personaId =
        session.personaId && allPersonaIds.includes(session.personaId) ? session.personaId : preferredPersonaId;
      if (!personaId) {
        personaId = preferredPersonaId;
      }

      if (session.targetType !== effectiveTarget || session.agencyId !== agencyId) {
        commitSession({
          id: sessionId,
          targetType: effectiveTarget,
          agencyId: agencyId ?? undefined
        });
      }

      setActiveSession(sessionId);

      streamHandles.current[sessionId]?.();
      delete streamHandles.current[sessionId];

      const displayName =
        effectiveTarget === "agency" ? resolveAgencyName(agencyId) : resolvePersonaName(personaId);
      const timestamp = Date.now();

      const agencyDefinition =
        effectiveTarget === "agency" && agencyId
          ? agencies.find((item) => item.id === agencyId) ?? null
          : null;

      const workflowDefinitionId = payload.workflowId ?? agencyDefinition?.workflowId;
      const workflowInstanceId = workflowDefinitionId ? `${workflowDefinitionId}-${sessionId}` : undefined;

      const agencyRequest =
        effectiveTarget === "agency" && agencyDefinition
          ? {
              agencyId: agencyId ?? undefined,
              workflowId: workflowInstanceId ?? undefined,
              goal: agencyDefinition.goal,
              participants: (agencyDefinition.participants ?? []).map((participant) => ({
                roleId: participant.roleId,
                personaId:
                  participant.personaId && allPersonaIds.includes(participant.personaId)
                    ? participant.personaId
                    : personaId,
              })),
              metadata: {
                ...agencyDefinition.metadata,
                sourceSessionId: sessionId,
              },
            }
          : undefined;

      const workflowRequest = workflowDefinitionId
        ? {
            definitionId: workflowDefinitionId,
            workflowId: workflowInstanceId,
            conversationId: sessionId,
            metadata: { source: "agentos-client" }
          }
        : undefined;

      commitSession({
        id: sessionId,
        targetType: effectiveTarget,
        displayName,
        personaId: effectiveTarget === "persona" ? personaId : undefined,
        agencyId: effectiveTarget === "agency" ? agencyId ?? undefined : undefined,
        status: "streaming"
      });

      pushEvent(sessionId, {
        id: crypto.randomUUID(),
        timestamp,
        type: "log",
        payload: {
          message: t("app.logs.userMessage", { displayName, content: payload.input })
        }
      });

      telemetry.startStream(sessionId);

      const cleanup = openAgentOSStream(
        {
          sessionId,
          personaId,
          messages: [{ role: "user", content: payload.input }],
          workflowRequest,
          agencyRequest,
          model: selectedModel
        },
        {
          onChunk: (chunk) => {
            try {
              // eslint-disable-next-line no-console
              console.debug("[AgentOS SSE] chunk:", chunk);
            } catch {
              // no-op
            }
            pushEvent(sessionId, {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              type: chunk.type,
              payload: chunk
            });

            telemetry.noteChunk(sessionId, chunk);

            if (chunk.type === AgentOSChunkType.AGENCY_UPDATE) {
              applyAgencySnapshot((chunk as AgentOSAgencyUpdateChunk).agency);
            }

            if (chunk.type === AgentOSChunkType.WORKFLOW_UPDATE) {
              applyWorkflowSnapshot((chunk as AgentOSWorkflowUpdateChunk).workflow);
            }
          },
          onDone: () => {
            commitSession({ id: sessionId, status: "idle" });
            telemetry.endStream(sessionId);
            delete streamHandles.current[sessionId];
          },
          onError: (error) => {
            pushEvent(sessionId, {
              id: crypto.randomUUID(),
              timestamp: Date.now(),
              type: "log",
              payload: { message: t("app.logs.streamError", { message: error.message }), level: "error" }
            });
            commitSession({ id: sessionId, status: "error" });
            telemetry.endStream(sessionId);
            delete streamHandles.current[sessionId];
          }
        }
      );

      streamHandles.current[sessionId] = cleanup;
    },
    [
      agencies,
      personas,
      applyAgencySnapshot,
      applyWorkflowSnapshot,
      ensureActiveSession,
      preferDefaultPersona,
      resolveAgencyName,
      resolvePersonaName,
      setActiveSession,
      commitSession,
      pushEvent,
      selectedModel,
      telemetry,
      t
    ]
  );

  // Removed auto-new-session on tab switch; tabs now only change view and filter.

  return (
    <>
      <SkipLink />
      {/* Top Header */}
      <header className="sticky top-0 z-50 border-b theme-border theme-bg-primary-soft px-4 py-3 backdrop-blur-sm transition-theme">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {!isDesktop && (
              <button
                type="button"
                className="mr-1 inline-flex items-center justify-center rounded-md border theme-border bg-[color:var(--color-background-secondary)] p-1 theme-text-primary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:hidden"
                aria-label="Open sidebar"
                onClick={() => setShowMobileSidebar(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
            )}
            <a href="https://agentos.sh" target="_blank" rel="noreferrer" className="group flex items-center gap-2">
              <img src="/agentos-icon.svg" alt="AgentOS" className="h-7 w-7" />
              <span className="flex items-baseline gap-0.5 text-[20px] font-semibold leading-none theme-text-primary">
                Agent
                <span
                  className="leading-none"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #8B5CF6, #EC4899)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  OS
                </span>
              </span>
            </a>
          </div>
          <nav className="flex items-center gap-4 text-xs">
            <a href="https://agentos.sh/docs" target="_blank" rel="noreferrer" className="theme-text-secondary transition-colors hover:text-[color:var(--color-accent-primary)]">Docs</a>
            <a href="https://github.com/framersai/agentos" target="_blank" rel="noreferrer" className="theme-text-secondary transition-colors hover:text-[color:var(--color-accent-primary)]">GitHub</a>
            <a href="https://vca.chat" target="_blank" rel="noreferrer" className="theme-text-secondary transition-colors hover:text-[color:var(--color-accent-primary)]">Marketplace</a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowThemePanel(!showThemePanel)}
                className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-2 py-1 text-xs theme-text-secondary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Theme settings"
              >
                Theme
              </button>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>
      {showThemePanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
          <div className="card-panel--strong w-full max-w-lg p-4 shadow-2xl shadow-[rgba(15,23,42,0.2)]">
            <ThemePanel />
            <div className="mt-3 flex justify-end">
              <button onClick={() => setShowThemePanel(false)} className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-3 py-1 text-xs theme-text-secondary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Close</button>
            </div>
          </div>
        </div>
      )}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" 
          role="dialog" 
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSettingsModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowSettingsModal(false);
            }
          }}
        >
          <div className="card-panel--strong flex h-full max-h-[90vh] w-full max-w-3xl flex-col shadow-2xl shadow-[rgba(15,23,42,0.2)] transition-theme">
            <div className="flex-1 overflow-y-auto p-4">
              <SettingsPanel />
            </div>
            <div className="border-t theme-border p-4">
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowSettingsModal(false)} 
                  className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-3 py-1 text-xs theme-text-secondary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAboutModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" 
          role="dialog" 
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAboutModal(false);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setShowAboutModal(false);
            }
          }}
        >
          <div className="card-panel--strong flex h-full max-h-[90vh] w-full max-w-3xl flex-col shadow-2xl shadow-[rgba(15,23,42,0.2)] transition-theme">
            <div className="flex-1 overflow-y-auto p-4">
              <AboutPanel />
            </div>
            <div className="border-t theme-border p-4">
              <div className="flex justify-end">
                <button 
                  onClick={() => setShowAboutModal(false)} 
                  className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-3 py-1 text-xs theme-text-secondary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className={`${sidebarCollapsed ? 'grid-cols-1' : 'grid-cols-panel'} grid min-h-screen w-full theme-bg-primary theme-text-primary transition-theme`}>
        {/* Navigation Sidebar */}
        {!sidebarCollapsed && (
          isDesktop ? (
            <Sidebar
              onCreateSession={handleCreateSession}
              onToggleCollapse={() => setSidebarCollapsed(true)}
              onNavigate={(key) => {
                if (key === 'settings') { setShowSettingsModal(true); return; }
                if (key === 'about') { setShowAboutModal(true); return; }
                setLeftTab(key as LeftTabKey);
              }}
            />
          ) : (
            showMobileSidebar && (
              <div className="fixed inset-0 z-50 flex lg:hidden">
                <div className="h-full w-80 max-w-[80%] overflow-y-auto border-r theme-border theme-bg-primary transition-theme">
                  <Sidebar
                    onCreateSession={handleCreateSession}
                    onToggleCollapse={() => setShowMobileSidebar(false)}
                    onNavigate={(key) => {
                      if (key === 'settings') { setShowSettingsModal(true); setShowMobileSidebar(false); return; }
                      if (key === 'about') { setShowAboutModal(true); setShowMobileSidebar(false); return; }
                      setLeftTab(key as LeftTabKey);
                      setShowMobileSidebar(false);
                    }}
                  />
                </div>
                <button className="flex-1 bg-black/40" aria-label="Close sidebar overlay" onClick={() => setShowMobileSidebar(false)} />
              </div>
            )
          )
        )}
        
        {/* Main Content Area */}
        <main 
          id="main-content"
          className="flex min-w-0 flex-col gap-6 overflow-y-auto theme-bg-primary-soft p-6 transition-theme"
          role="main"
          aria-label={t("app.labels.mainContent", { defaultValue: "Main content area" })}
        >
          {sidebarCollapsed && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSidebarCollapsed(false)}
                className="rounded-full border theme-border bg-[color:var(--color-background-secondary)] px-3 py-1 text-xs theme-text-secondary transition-colors hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                title="Show sidebar"
              >
                Show sidebar
              </button>
            </div>
          )}
          <div className="flex min-w-0 flex-1 min-h-0 flex-col gap-6 md:grid md:grid-cols-[1fr_2fr]">
            {/* Left Column: Tabbed coordination */}
            <section className="flex h-full flex-col gap-4" aria-label={t("app.labels.leftPanel", { defaultValue: "Composer and coordination" })}>
              <div
                role="tablist"
                aria-label="Left panel tabs"
                className="card-panel--strong p-2 text-sm transition-theme"
                data-tour="tabs"
              >
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  {LEFT_TABS.map((tab) => {
                    const active = leftTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        role="tab"
                        aria-selected={active}
                        onClick={() => setLeftTab(tab.key)}
                        className={`rounded-full border px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                          active
                            ? "theme-bg-accent theme-text-on-accent shadow-sm"
                            : "theme-text-secondary theme-bg-secondary border theme-border hover:opacity-95"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
              <div className="ml-auto" />
                </div>
              </div>
              {leftTab === 'compose' && (
                activeSession?.targetType === 'agency' ? (
                  <AgencyComposer
                    onSubmit={(agencyPayload) => {
                      const sessionId = activeSessionId || crypto.randomUUID();
                      setActiveSession(sessionId);
                      
                      // Parse roles from markdown if needed
                      let roles: AgentRoleConfig[] = agencyPayload.roles;
                      if (agencyPayload.format === 'markdown' && agencyPayload.markdownInput) {
                        const lines = agencyPayload.markdownInput.split('\n').filter(l => l.trim());
                        roles = [];
                        for (const line of lines) {
                          const match = line.match(/^\[([^\]]+)\]\s*(.+)$/);
                          if (match) {
                            const roleId = match[1].trim().toLowerCase().replace(/\s+/g, '_');
                            const instruction = match[2].trim();
                            const persona = remotePersonas[roles.length % remotePersonas.length] || personas[0];
                            roles.push({
                              roleId,
                              personaId: persona?.id || 'v_researcher',
                              instruction,
                              priority: roles.length + 1,
                            });
                          }
                        }
                      }
                      
                      // Start agency workflow via dedicated endpoint
                      streamHandles.current[sessionId]?.();
                      delete streamHandles.current[sessionId];
                      
                      commitSession({
                        id: sessionId,
                        targetType: 'agency',
                        displayName: activeSession?.displayName || 'Agency Workflow',
                        agencyId: activeSession?.agencyId,
                        status: 'streaming',
                      });
                      
                      pushEvent(sessionId, {
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'log',
                        payload: { message: `Starting agency workflow: ${agencyPayload.goal}` },
                      });
                      
                      telemetry.startStream(sessionId);
                      
                      // Use backend API endpoint for agency workflows
                      const params = new URLSearchParams({
                        userId: 'agentos-workbench-user',
                        conversationId: sessionId,
                        goal: agencyPayload.goal,
                        roles: JSON.stringify(roles.map(r => ({
                          roleId: r.roleId,
                          personaId: r.personaId,
                          instruction: r.instruction,
                          priority: r.priority,
                        }))),
                        outputFormat: agencyPayload.outputFormat || 'markdown',
                      });

                      const baseUrl = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001');
                      const eventSource = new EventSource(`${baseUrl}/api/agentos/agency/stream?${params.toString()}`);

                      const cleanup = () => {
                        eventSource.close();
                        delete streamHandles.current[sessionId];
                      };

                      eventSource.onmessage = (event) => {
                        try {
                          const chunk = JSON.parse(event.data);
                          
                          pushEvent(sessionId, {
                            id: crypto.randomUUID(),
                            timestamp: Date.now(),
                            type: chunk.type as AgentOSChunkType,
                            payload: chunk,
                          });
                          telemetry.noteChunk(sessionId, chunk);
                          
                          if (chunk.type === 'agency_update') {
                            applyAgencySnapshot((chunk as AgentOSAgencyUpdateChunk).agency);
                          }
                        } catch (error) {
                          console.error('[Agency Stream] Failed to parse chunk:', error);
                        }
                      };

                      eventSource.addEventListener('done', () => {
                        commitSession({ id: sessionId, status: 'idle' });
                        telemetry.endStream(sessionId);
                        cleanup();
                      });

                      eventSource.addEventListener('error', () => {
                        pushEvent(sessionId, {
                          id: crypto.randomUUID(),
                          timestamp: Date.now(),
                          type: 'log',
                          payload: { message: 'Agency stream connection error', level: 'error' },
                        });
                        commitSession({ id: sessionId, status: 'error' });
                        telemetry.endStream(sessionId);
                        cleanup();
                      });

                      eventSource.onerror = (error) => {
                        pushEvent(sessionId, {
                          id: crypto.randomUUID(),
                          timestamp: Date.now(),
                          type: 'log',
                          payload: { message: `Agency stream error: ${error.type}`, level: 'error' },
                        });
                        commitSession({ id: sessionId, status: 'error' });
                        telemetry.endStream(sessionId);
                        cleanup();
                      };
                      
                      streamHandles.current[sessionId] = cleanup;
                    }}
                    disabled={!backendReady || isAgencyStreaming}
                    isSubmitting={isAgencyStreaming}
                  />
                ) : (
                  <RequestComposer key={activeSessionId || 'compose'} onSubmit={handleSubmit} />
                )
              )}
              {leftTab === 'personas' && <PersonaCatalog />}
              {leftTab === 'agency' && <AgencyManager />}
              {leftTab === 'workflows' && <WorkflowOverview />}
            </section>

            {/* Right Column: Outputs - Stack on mobile, side-by-side on desktop */}
            <aside
              className="flex min-w-0 h-full max-h-[calc(100vh-6rem)] flex-col gap-4 md:gap-6"
              aria-label={t("app.labels.outputsPanel", { defaultValue: "Outputs and results" })}
            >
              <SessionInspector />
              <div className="border-t border-slate-200 dark:border-white/10 md:hidden" />
              <div className="grid gap-4 sm:grid-cols-2 md:block md:space-y-6">
                <section className="card-panel--strong p-4 sm:p-5 transition-theme">
                  <header className="mb-2">
                    <p className="text-xs uppercase tracking-[0.3em] theme-text-muted">Stream status</p>
                    <h3 className="text-sm font-semibold theme-text-primary">Live telemetry</h3>
                  </header>
                  <TelemetryView />
                </section>
                <section className="card-panel--strong p-4 sm:p-5 transition-theme">
                  <header className="mb-2">
                    <p className="text-xs uppercase tracking-[0.3em] theme-text-muted">Analytics</p>
                    <h3 className="text-sm font-semibold theme-text-primary">Usage insights</h3>
                  </header>
                  <AnalyticsView selectedModel={selectedModel} onChangeModel={setSelectedModel} modelOptions={modelOptions} modelData={modelData} />
                </section>
              </div>
            </aside>
          </div>
        </main>
      </div>
      {/* Footer with tagline */}
      <footer className="border-t theme-border theme-bg-primary px-6 py-4 text-xs theme-text-muted transition-theme">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="uppercase tracking-[0.25em]">AgentOS — Cognitive Operating System</span>
          <div className="flex items-center gap-3">
            <a href="https://agentos.sh" target="_blank" rel="noreferrer" className="transition-colors hover:text-[color:var(--color-accent-primary)]">agentos.sh</a>
            <a href="https://github.com/framersai/agentos" target="_blank" rel="noreferrer" className="transition-colors hover:text-[color:var(--color-accent-primary)]">GitHub</a>
          </div>
        </div>
      </footer>
      <TourOverlay
        open={showTour}
        steps={tourSteps}
        onClose={() => setShowTour(false)}
        onDontShowAgain={() => dismissWelcomeTour()}
        onRemindLater={() => snoozeWelcomeTour(24)}
      />
      <ImportWizard open={showImport} onClose={() => setShowImport(false)} />
    </>
  );
}
