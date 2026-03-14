// Stub: ElevenLabs voice agent - only works with native SDK
export function useConversation(_options?: any) {
  return {
    status: "disconnected" as const,
    isSpeaking: false,
    startSession: async (_config?: any) => {},
    endSession: async () => {},
    sendUserMessage: (_msg: string) => {},
  };
}
