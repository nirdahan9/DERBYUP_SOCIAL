export interface JsonGenerationRequest {
  system: string;
  prompt: string;
  temperature?: number;
}

export interface AgentLlmProvider {
  generateJson<T>(request: JsonGenerationRequest): Promise<T>;
}

interface GroqChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class GroqProvider implements AgentLlmProvider {
  constructor(
    private readonly apiKey: string,
    private readonly model = "llama-3.3-70b-versatile",
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async generateJson<T>(request: JsonGenerationRequest): Promise<T> {
    const response = await this.fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: this.model,
        temperature: request.temperature ?? 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${request.system}\nReturn only valid JSON. Do not include markdown fences.`
          },
          {
            role: "user",
            content: request.prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Groq request failed: ${response.status} ${body}`);
    }

    const data = (await response.json()) as GroqChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Groq response did not include message content.");

    return parseJsonObject<T>(content);
  }
}

export function createDefaultLlmProvider(env: NodeJS.ProcessEnv = process.env): AgentLlmProvider | undefined {
  if (env.AGENT_LLM_PROVIDER && env.AGENT_LLM_PROVIDER !== "groq") return undefined;
  if (!env.GROQ_API_KEY) return undefined;
  return new GroqProvider(env.GROQ_API_KEY, env.AGENT_LLM_MODEL ?? "llama-3.3-70b-versatile");
}

export function parseJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
      throw new Error("LLM response was not valid JSON.");
    }
    return JSON.parse(trimmed.slice(start, end + 1)) as T;
  }
}
