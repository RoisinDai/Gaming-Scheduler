export type DataSource = "mock" | "supabase";

interface EnvLike {
  NODE_ENV?: string;
  QUEUE_UP_DATA_SOURCE?: string;
}

/** Mock data and mock login are development-only; production refuses to start with them. */
export function resolveDataSource(env: EnvLike = process.env): DataSource {
  const requested = env.QUEUE_UP_DATA_SOURCE;
  const isProduction = env.NODE_ENV === "production";
  const source: DataSource = requested === "supabase" || requested === "mock" ? requested : isProduction ? "supabase" : "mock";
  if (source === "mock" && isProduction) {
    throw new Error("Mock data and mock login cannot be used in production. Set QUEUE_UP_DATA_SOURCE=supabase.");
  }
  return source;
}

export function isMockMode(): boolean {
  return resolveDataSource() === "mock";
}
