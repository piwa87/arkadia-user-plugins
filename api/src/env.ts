/** Generated bindings plus the dashboard-only secret, which is absent from config. */
export interface Env extends WorkerBindings {
  /** Secret used only by the per-club moderation endpoints. */
  RKG_ADMIN?: string;
}
