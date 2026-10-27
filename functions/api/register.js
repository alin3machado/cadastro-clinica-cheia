export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json();

    const requiredFields = [
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

    for (const field of requiredFields) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        String(data[field]).trim() === ""
      ) {
        return Response.json(
          { ok: false, error: `Campo obrigatório: ${field}` },
          { status: 400 }
        );
      }
    }

    const nome = String(data.full_name).trim();
    const email = String(data.email).trim().toLowerCase();
    const whatsapp = String(data.whatsapp).replace(/\D/g, "");

    if (nome.length > 180) {
      return Response.json(
        { ok: false, error: "Nome muito longo." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json(
        { ok: false, error: "E-mail inválido." },
        { status: 400 }
      );
    }

    if (whatsapp.length < 10 || whatsapp.length > 15) {
      return Response.json(
        { ok: false, error: "WhatsApp inválido." },
        { status: 400 }
      );
    }

    // 1. Salvar o cadastro no banco de dados D1.
    await env.DB.prepare(`
      INSERT INTO registrations (
        full_name,
        whatsapp,
        email,
        city,
        state,
        professional_role,
        professional_training,
        advanced_aesthetics_postgrad,
        clinic_duration,
        patients_per_month,
        treatments_most_performed,
        ticket_medio,
        clinic_ownership_role,
        commercial_challenge,
        main_goal,
        commercial_consent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nome,
      whatsapp,
      email,
      String(data.city).trim(),
      String(data.state).trim(),
      String(data.professional_role).trim(),
      String(data.professional_training).trim(),
      String(data.advanced_aesthetics_postgrad).trim(),
      String(data.clinic_duration).trim(),
      String(data.patients_per_month).trim(),
      String(data.treatments_most_performed).trim(),
      data.ticket_medio ? String(data.ticket_medio).trim() : null,
      String(data.clinic_ownership_role).trim(),
      String(data.commercial_challenge).trim(),
      String(data.main_goal).trim(),
      data.commercial_consent ? 1 : 0
    ).run();

    // 2. Conferir se as configurações do EmailJS existem.
    const emailConfigured = Boolean(
      env.EMAILJS_SERVICE_ID &&
      env.EMAILJS_TEMPLATE_ID &&
      env.EMAILJS_PUBLIC_KEY &&
      env.EMAILJS_PRIVATE_KEY
    );

    let emailSent = false;
    let emailStatus = null;
    let emailError = null;

    // 3. Enviar o e-book por e-mail.
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
              accessToken: env.EMAILJS_PRIVATE_KEY,
              template_params: {
                nome: nome.split(/\s+/)[0],
                email: email
              }
            })
          }
        );

        emailStatus = response.status;
        emailSent = response.ok;

        if (!response.ok) {
          emailError = (await response.text()).slice(0, 500);
        }

        console.log("EmailJS result:", {
          status: emailStatus,
          success: emailSent,
          error: emailError
        });
      } catch (error) {
        emailError = String(error?.message || "Erro de conexão");
        console.error("Erro no envio por e-mail:", emailError);
      }
    } else {
      emailError = "Variáveis do EmailJS não configuradas.";
    }

    // 4. Retornar o resultado do cadastro e do envio.
    return Response.json(
      {
        ok: true,
        email_configured: emailConfigured,
        email_sent: emailSent,
        email_status: emailStatus,
        email_error: emailError
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Erro ao processar cadastro:", error);

    return Response.json(
      {
        ok: false,
        error: "Não foi possível processar o cadastro."
      },
      { status: 500 }
    );
  }
}
