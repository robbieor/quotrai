// Typed window-event helpers used by the registry-driven voice tools.
// The voice provider sits ABOVE <BrowserRouter> in App.tsx, so client tools
// cannot call useNavigate() directly — they dispatch these events instead,
// and the AgentNavigationBridge (mounted inside the router) handles them.

export const AGENT_NAVIGATE = "foreman-agent-navigate";
export const AGENT_HIGHLIGHT = "foreman-agent-highlight";
export const AGENT_PROGRESS = "foreman-agent-progress";
export const AGENT_SCROLL = "foreman-agent-scroll";

export type AgentProgressStatus = "running" | "done" | "error";

export const emitAgentNavigate = (path: string, reason?: string) =>
  window.dispatchEvent(
    new CustomEvent(AGENT_NAVIGATE, { detail: { path, reason } })
  );

export const emitAgentScroll = (section: string) =>
  window.dispatchEvent(
    new CustomEvent(AGENT_SCROLL, { detail: { section } })
  );

export const emitAgentHighlight = (section: string, label?: string) =>
  window.dispatchEvent(
    new CustomEvent(AGENT_HIGHLIGHT, { detail: { section, label } })
  );

export const emitAgentProgress = (
  message: string,
  status: AgentProgressStatus = "running"
) =>
  window.dispatchEvent(
    new CustomEvent(AGENT_PROGRESS, { detail: { message, status } })
  );
