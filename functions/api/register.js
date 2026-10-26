export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return Response.json({error:"Dados inválidos."},{status:400}); }
  const required = ["full_name","whatsapp","email","city","state","professional_role","professional_training","advanced_aesthetics_postgrad","clinic_duration","patients_per_month","treatments_most_performed","clinic_ownership_role","commercial_challenge","main_goal"];
  for (const k of required) if (!String(body[k] ?? "").trim()) return Response.json({error:"Preencha todos os campos obrigatórios."},{status:400});
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) return Response.json({error:"Informe um e-mail válido."},{status:400});
  const digits = String(body.whatsapp).replace(/\D/g,"");
  if (digits.length < 10 || digits.length > 15) return Response.json({error:"Informe um WhatsApp com DDD válido."},{status:400});
  if (String(body.full_name).length > 180 || digits.length > 15) return Response.json({error:"Confira os dados informados."},{status:400});
  const sql = `INSERT INTO registrations
    (full_name,whatsapp,email,city,state,professional_role,professional_training,advanced_aesthetics_postgrad,clinic_duration,patients_per_month,treatments_most_performed,ticket_medio,clinic_ownership_role,commercial_challenge,main_goal,commercial_consent)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
  try {
    await env.DB.prepare(sql).bind(
      String(body.full_name).trim(),digits,String(body.email).trim().toLowerCase(),
      String(body.city).trim(),String(body.state).trim(),String(body.professional_role),
      String(body.professional_training),String(body.advanced_aesthetics_postgrad),String(body.clinic_duration),
      String(body.patients_per_month),String(body.treatments_most_performed).trim(),
      String(body.ticket_medio ?? "").trim() || null,String(body.clinic_ownership_role),
      String(body.commercial_challenge),String(body.main_goal),body.commercial_consent ? 1 : 0
    ).run();
  } catch (e) {
    return Response.json({error:"Não foi possível salvar o cadastro agora."},{status:500});
  }

  // The ebook delivery is transactional and independent of optional commercial-marketing consent.
  // The message template must be approved in WhatsApp Manager and secrets configured in Cloudflare.
  
  // Diagnóstico seguro: nunca registrar tokens ou o número do cliente.
  const waConfigured = !!(
    env.WHATSAPP_TOKEN &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_TEMPLATE_NAME &&
    env.EBOOK_PUBLIC_URL
  );

  console.log("WhatsApp config:", {
    configured: waConfigured,
    hasToken: !!env.WHATSAPP_TOKEN,
    hasPhoneNumberId: !!env.WHATSAPP_PHONE_NUMBER_ID,
    hasTemplateName: !!env.WHATSAPP_TEMPLATE_NAME,
    hasEbookUrl: !!env.EBOOK_PUBLIC_URL
  });

  let whatsappSent = false;

  if (waConfigured) {
    try {
      const phone = digits.startsWith("55") ? digits : `55${digits}`;
      const version = env.META_GRAPH_API_VERSION || "v23.0";

      const response = await fetch(
        `https://graph.facebook.com/${version}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: phone,
            type: "template",
            template: {
              name: env.WHATSAPP_TEMPLATE_NAME,
              language: {
                code: env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR"
              },
              components: [{
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: String(body.full_name).trim().split(/\s+/)[0]
                  },
                  {
                    type: "text",
                    text: env.EBOOK_PUBLIC_URL
                  }
                ]
              }]
            }
          })
        }
      );

      const result = await response.json().catch(() => ({}));
      whatsappSent = response.ok;

      console.log("WhatsApp API result:", {
        httpStatus: response.status,
        success: response.ok,
        errorCode: result?.error?.code ?? null,
        errorSubcode: result?.error?.error_subcode ?? null,
        errorMessage: result?.error?.message ?? null,
        errorDetails: result?.error?.error_data?.details ?? null
      });
    } catch (e) {
      console.error("WhatsApp request exception:", String(e?.message || "Erro de rede"));
    }
  } else {
    console.error("WhatsApp não enviado: faltam variáveis obrigatórias.");
  }

  // O cadastro continua salvo mesmo que o envio falhe.
  return Response.json(
    {
      ok: true,
      whatsapp_sent: whatsappSent,
      whatsapp_configured: waConfigured
    },
    { status: 201 }
  );
  return Response.json({ok:true, whatsapp_sent:whatsappSent, whatsapp_configured:waConfigured},{status:201});
}
