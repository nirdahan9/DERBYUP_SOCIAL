import { PostgresStore } from "./postgresStore.js";
import { InMemoryStore, type RunStore } from "./store.js";

const postgresStore = PostgresStore.fromEnv();

export const runStore: RunStore = postgresStore ?? new InMemoryStore();
export const storeKind = postgresStore ? "postgres" : "memory";
