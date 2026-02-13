import { URLSearchParams } from "url";

export type ColisExpressAccount = {
  baseUrl: string;     // https://api.coliexpres.com
  externalId: string;  // 819
  apiKey: string;      // cle_api
};

export async function colisExpressGetParcel(account: ColisExpressAccount, codeBarre: string) {
  const body = new URLSearchParams();
  body.set("action", "get");
  body.set("id", account.externalId);
  body.set("cle_api", account.apiKey);
  body.set("code_barre", codeBarre);

  const res = await fetch(account.baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const text = await res.text();

  // أحيانًا يرجّع HTML في الأخطاء
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* ignore */ }

  return { status: res.status, raw: text, json: data };
}

