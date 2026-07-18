export interface GeminiCallbacks {
    onOpen: () => void;
    onMessage: (message: any) => void;
    onError: (error: any) => void;
    onClose: (event: any) => void;
}
export declare function createGeminiSession(systemPrompt: string, callbacks: GeminiCallbacks): Promise<import("@google/genai", { with: { "resolution-mode": "import" } }).Session>;
//# sourceMappingURL=gemini.d.ts.map