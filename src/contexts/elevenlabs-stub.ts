// Stub: ElevenLabs is only used in native/voice context
export function useConversation(_options?: any) {
  return { status: "disconnected" as const, isSpeaking: false, startSession: async (_config?: any) => {}, endSession: async () => {} };
}
