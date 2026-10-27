
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

  const email = String(body.email).trim().toLowerCase();
  const fullName = String(body.full_name).trim();
  const digits = String(body.whatsapp).replace(/\D/g, "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json(
      { error: "Informe um e-mail válido." },
      { status: 400 }
    );
  }

  if (digits.length < 10 || digits.length > 15) {
    return Response.json(
      { error: "Informe um WhatsApp com DDD válido." },
      { status: 400 }
    );
  }

  if (fullName.length > 180) {
    return Response.json(
      { error: "Confira os dados informados." },
      { status: 400 }
    );
  }

  const sql = `INSERT INTO registrations
    (full_name,whatsapp,email,city,state,professional_role,
    professional_training,advanced_aesthetics_postgrad,
    clinic_duration,patients_per_month,treatments_most_performed,
    ticket_medio,clinic_ownership_role,commercial_challenge,
    main_goal,commercial_consent)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;

  try {
    await env.DB.prepare(sql).bind(
      fullName,
      digits,
      email,
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

  const emailConfigured = Boolean(
    env.EMAILJS_SERVICE_ID &&
    env.EMAILJS_TEMPLATE_ID &&
    env.EMAILJS_PUBLIC_KEY
  );

  let emailSent = false;

  if (!emailConfigured) {
    console.error(
      "EmailJS não configurado: verifique as variáveis do Cloudflare."
    );
  } else {
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
              nome: fullName.split(/\s+/)[0],
              email
            }
          })
        }
      );

      emailSent = response.ok;

      if (!response.ok) {
        const error = (await response.text()).slice(0, 500);

        console.error("EmailJS result:", {
          status: response.status,
          error
        });
      } else {
        console.log("EmailJS result:", {
          status: response.status,
          success: true
        });
      }
    } catch (e) {
      console.error(
        "Erro no envio por e-mail:",
        String(e?.message || "Erro de conexão")
      );
    }
  }

  return Response.json(
    {
      ok: true,
      email_configured: emailConfigured,
      email_sent: emailSent
    },
    { status: 201 }
  );
}
