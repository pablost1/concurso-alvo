"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { criarSessao, encerrarSessao, getUserId } from "@/lib/session";

export type EstadoForm = { erro?: string } | undefined;

const CadastroSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome"),
  email: z.string().trim().toLowerCase().email("E-mail inválido"),
  senha: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

export async function cadastrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const p = CadastroSchema.safeParse(Object.fromEntries(form));
  if (!p.success) return { erro: p.error.issues[0].message };
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return { erro: "E-mail já cadastrado" };
  const user = await prisma.user.create({
    data: { nome: p.data.nome, email: p.data.email, senhaHash: await bcrypt.hash(p.data.senha, 12), perfil: { create: {} } },
  });
  await criarSessao(user.id);
  redirect("/concursos");
}

export async function entrar(_: EstadoForm, form: FormData): Promise<EstadoForm> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const user = await prisma.user.findUnique({ where: { email } });
  // compara sempre, para não revelar se o e-mail existe pelo tempo de resposta
  const ok = await bcrypt.compare(senha, user?.senhaHash ?? "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvali");
  if (!user || !ok) return { erro: "E-mail ou senha incorretos" };
  await criarSessao(user.id);
  redirect("/concursos");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}

export async function adicionarAlvo(cargoId: string) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  await prisma.alvo.upsert({ where: { userId_cargoId: { userId, cargoId } }, create: { userId, cargoId }, update: {} });
  revalidatePath("/meus-alvos");
  redirect("/meus-alvos");
}

export async function removerAlvo(alvoId: string) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  await prisma.alvo.deleteMany({ where: { id: alvoId, userId } });
  revalidatePath("/meus-alvos");
}

export async function definirEdital(concursoId: string, form: FormData) {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  const url = z.string().url().safeParse(String(form.get("url") ?? "").trim());
  if (!url.success || !/^https?:/.test(url.data)) return;
  await prisma.concurso.update({ where: { id: concursoId }, data: { editalUrl: url.data } });
  revalidatePath("/meus-alvos");
}
