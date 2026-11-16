import { NextRequest, NextResponse } from "next/server";
import { SHEET_ID, SHEET_TAB, parseSheet, publicView } from "@/lib/sheet";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(SHEET_TAB)}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  const text = res.ok ? await res.text() : "";
  if (!text || text.trimStart().startsWith("<"))
    return NextResponse.json({ admin: false, error: "Não foi possível ler a planilha. Confira o compartilhamento (“qualquer pessoa com o link”) e o nome da aba." }, { status: 502 });
  const recs = parseSheet(text);
  const token = process.env.ADMIN_TOKEN;
  const admin = !!token && req.headers.get("x-admin-token") === token;
  return NextResponse.json(admin ? { admin: true, recs } : publicView(recs));
}
