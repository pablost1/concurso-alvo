"use client";

import { useActionState } from "react";
import type { EstadoForm } from "./actions";

export function FormAuth({
  action, cadastro,
}: { action: (s: EstadoForm, f: FormData) => Promise<EstadoForm>; cadastro?: boolean }) {
  const [estado, formAction, pendente] = useActionState(action, undefined);
  return (
    <form action={formAction} className="col">
      {cadastro && <input name="nome" placeholder="Nome" autoComplete="name" required />}
      <input name="email" type="email" placeholder="E-mail" autoComplete="email" required />
      <input name="senha" type="password" placeholder="Senha (mín. 8 caracteres)" autoComplete={cadastro ? "new-password" : "current-password"} required />
      {estado?.erro && <p className="err" role="alert">{estado.erro}</p>}
      <button type="submit" disabled={pendente}>{pendente ? "Aguarde…" : cadastro ? "Criar conta" : "Entrar"}</button>
    </form>
  );
}
