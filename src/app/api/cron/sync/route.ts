import { NextResponse } from "next/server";
import { sincronizar } from "@/lib/sync";
import { getUserId } from "@/lib/session";

export const maxDuration = 300;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const autorizado =
    (secret && req.headers.get("authorization") === `Bearer ${secret}`) || (await getUserId()) !== null;
  if (!autorizado) return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  try {
    return NextResponse.json(await sincronizar());
  } catch (e) {
    return NextResponse.json({ erro: (e as Error).message }, { status: 500 });
  }
}
