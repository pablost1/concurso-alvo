export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DISABLE_CRON === "1") return;
  const cron = await import("node-cron");
  const { sincronizar } = await import("./lib/sync");
  const { sincronizarProvas } = await import("./lib/provas/sync");
  // Concursos a cada 6 horas; provas anteriores logo depois (30 min de folga), em lotes.
  cron.schedule("0 */6 * * *", () => {
    sincronizar().catch((e) => console.error("[sync]", e.message));
  });
  cron.schedule("30 */6 * * *", () => {
    sincronizarProvas().catch((e) => console.error("[provas]", e.message));
  });
}
