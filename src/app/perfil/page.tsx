import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getUserId } from "@/lib/session";

export default async function Perfil() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const [user, perfil, cargos] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.perfil.findUnique({ where: { userId } }),
    prisma.progressoCargo.findMany({ where: { userId }, orderBy: { xp: "desc" } }),
  ]);
  const info = await prisma.cargo.findMany({ where: { id: { in: cargos.map((c) => c.cargoId) } }, include: { concurso: true } });
  const nomes = new Map(info.map((c) => [c.id, `${c.nome} · ${c.concurso.orgao}`]));
  const xp = perfil?.xpTotal ?? 0, nivel = perfil?.nivel ?? 1;
  const base = 100 * (nivel - 1) ** 2, prox = 100 * nivel ** 2;
  const pct = Math.round(((xp - base) / (prox - base)) * 100);
  return (
    <>
      <h1>{user.nome}</h1>
      <div className="card">
        <div className="row"><strong>Nível {nivel}</strong><span className="xp">{xp} XP</span><span>🔥 {perfil?.streakDias ?? 0} dia(s) seguidos</span></div>
        <div className="bar" aria-label="Progresso para o próximo nível"><i style={{ width: `${pct}%` }} /></div>
        <p className="mut">{prox - xp} XP para o nível {nivel + 1}</p>
      </div>
      <h2>Cargos estudados</h2>
      {cargos.length === 0 && <div className="card">Você ainda não respondeu questões.</div>}
      {cargos.map((c) => (
        <div key={c.id} className="card">
          <div className="row"><strong style={{ flex: 1 }}>{nomes.get(c.cargoId)}</strong><span className="xp">{c.xp} XP</span><span>{c.proficiencia}%</span></div>
          <div className="bar" aria-label="Proficiência"><i style={{ width: `${c.proficiencia}%` }} /></div>
        </div>
      ))}
    </>
  );
}
