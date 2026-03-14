// Stub for ElevenLabs - voice agent functionality
// This is a placeholder since @elevenlabs/react is not installed in web context

export function useConversation(_options?: any) {
  return {
    status: "disconnected" as const,
    isSpeaking: false,
    startSession: async (_config?: any) => {},
    endSession: async () => {},
  };
}
