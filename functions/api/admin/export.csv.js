export async function onRequestGet({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) return new Response("Não autorizado.",{status:401});
  const { results = [] } = await env.DB.prepare("SELECT * FROM registrations ORDER BY created_at DESC").all();
  const cols = ["id","created_at","full_name","whatsapp","email","city","state","professional_role","professional_training","advanced_aesthetics_postgrad","clinic_duration","patients_per_month","treatments_most_performed","ticket_medio","clinic_ownership_role","commercial_challenge","main_goal","commercial_consent"];
  const csv = [cols.join(","),...results.map(row=>cols.map(c=>`"${String(row[c] ?? "").replaceAll('"','""')}"`).join(","))].join("\r\n");
  return new Response("\uFEFF"+csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=cadastros-clinica-cheia.csv","Cache-Control":"no-store"}});
}
