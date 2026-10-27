
export async function onRequestPost({ request, env }) {
  let body;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Dados inválidos." },
      { status: 400 }
    );
  }

  // Validar campos obrigatórios
  const required = [
    "full_name",
    "whatsapp",
    "email",
    "city",
    "state",
    "professional_role",
    "professional_training",
    "advanced_aesthetics_postgrad",
    "clinic_duration",
    "patients_per_month",
    "treatments_most_performed",
    "clinic_ownership_role",
    "commercial_challenge",
    "main_goal"
  ];

  for (const key of required) {
    if (!String(body[key] ?? "").trim()) {
      return Response.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }
  }

  // Validar e-mail
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
    return Response.json(
      { error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  // Validar WhatsApp
  const digits = String(body.whatsapp).replace(/\D/g, "");

  if (digits.length < 10 || digits.length > 15) {
    return Response.json(
      { error: "Informe um WhatsApp com DDD válido." },
      { status: 400 }
    );
  }

  if (String(body.full_name).length > 180) {
    return Response.json(
      { error: "Confira os dados informados." },
      { status: 400 }
    );
  }

  // Salvar cadastro no banco de dados
  const sql = `INSERT INTO registrations
    (full_name,whatsapp,email,city,state,professional_role,
    professional_training,advanced_aesthetics_postgrad,
    clinic_duration,patients_per_month,treatments_most_performed,
    ticket_medio,clinic_ownership_role,commercial_challenge,
    main_goal,commercial_consent)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  try {
    await env.DB.prepare(sql).bind(
      String(body.full_name).trim(),
      digits,
      String(body.email).trim().toLowerCase(),
      String(body.city).trim(),
      String(body.state).trim(),
      String(body.professional_role),
      String(body.professional_training),
      String(body.advanced_aesthetics_postgrad),
      String(body.clinic_duration),
      String(body.patients_per_month),
      String(body.treatments_most_performed).trim(),
      String(body.ticket_medio ?? "").trim() || null,
      String(body.clinic_ownership_role),
      String(body.commercial_challenge),
      String(body.main_goal),
      body.commercial_consent ? 1 : 0
    ).run();
  } catch (e) {
    console.error(
      "Erro ao salvar cadastro:",
      String(e?.message || "Erro")
    );

    return Response.json(
      { error: "Não foi possível salvar o cadastro agora." },
      { status: 500 }
    );
  }

  // Envio do e-book por e-mail via EmailJS
  let emailSent = false;
  let emailError = null;

  const emailConfigured = Boolean(
    env.EMAILJS_SERVICE_ID &&
    env.EMAILJS_TEMPLATE_ID &&
    env.EMAILJS_PUBLIC_KEY
  );

  console.log("EmailJS config:", {
    configured: emailConfigured,
    hasServiceId: Boolean(env.EMAILJS_SERVICE_ID),
    hasTemplateId: Boolean(env.EMAILJS_TEMPLATE_ID),
    hasPublicKey: Boolean(env.EMAILJS_PUBLIC_KEY)
  });

  if (emailConfigured) {
    try {
      const response = await fetch(
        "https://api.emailjs.com/api/v1.0/email/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            service_id: env.EMAILJS_SERVICE_ID,
            template_id: env.EMAILJS_TEMPLATE_ID,
            user_id: env.EMAILJS_PUBLIC_KEY,
            template_params: {
              nome: String(body.full_name)
                .trim()
                .split(/\s+/)[0],
              email: String(body.email)
                .trim()
                .toLowerCase()
            }
          })
        }
      );

      emailSent = response.ok;

      if (!response.ok) {
        emailError = (await response.text()).slice(0, 500);
      }

      console.log("EmailJS result:", {
        status: response.status,
        success: emailSent,
        error: emailError
      });
    } catch (e) {
      emailError = String(e?.message || "Erro de conexão");

      console.error("Erro no envio por e-mail:", emailError);
    }
  } else {
    console.error(
      "EmailJS não configurado: verifique as variáveis do Cloudflare."
    );
  }

  // Envio independente pelo WhatsApp
  let whatsappSent = false;

  const waConfigured = Boolean(
    env.WHATSAPP_TOKEN &&
    env.WHATSAPP_PHONE_NUMBER_ID &&
    env.WHATSAPP_TEMPLATE_NAME &&
    env.EBOOK_PUBLIC_URL
  );

  if (waConfigured) {
    try {
      const phone = digits.startsWith("55")
        ? digits
        : `55${digits}`;

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
                    text: String(body.full_name)
                      .trim()
                      .split(/\s+/)[0]
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

      whatsappSent = response.ok;

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        console.log("WhatsApp API error:", {
          status: response.status,
          code: result?.error?.code ?? null,
          message: result?.error?.message ?? null
        });
      }
    } catch (e) {
      console.error(
        "Erro no envio pelo WhatsApp:",
        String(e?.message || "Erro")
      );
    }
  }

  // O cadastro permanece salvo mesmo se algum envio falhar.
  return Response.json(
    {
      ok: true,
      email_sent: emailSent,
      email_configured: emailConfigured,
      whatsapp_sent: whatsappSent,
      whatsapp_configured: waConfigured
    },
    { status: 201 }
  );
}
