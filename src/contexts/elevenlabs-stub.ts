// Stub: ElevenLabs voice agent - only works with native SDK
type ConnectionStatus = "disconnected" | "connected" | "connecting" | "disconnecting";

export function useConversation(_options?: any) {
  return {
    status: "disconnected" as ConnectionStatus,
    isSpeaking: false,
    startSession: async (_config?: any) => {},
    endSession: async () => {},
    sendUserMessage: (_msg: string) => {},
  };
}
