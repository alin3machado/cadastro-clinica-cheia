# Cadastro — Clínica Cheia, Faturamento Maior?

Projeto inicial para publicar um formulário responsivo no Cloudflare Pages com Cloudflare D1 para armazenamento.

## O que contém
- Formulário mobile em cinza-claro, vermelho, preto e branco.
- 15 perguntas, incluindo ticket médio como pergunta opcional.
- Consentimento para comunicações comerciais separado e opcional.
- Endpoint de envio com validação básica.
- Endpoint administrativo para listar e exportar CSV (protegido por token).
- Banco D1 e instruções de publicação.

## Importante
O questionário foi reconstruído com base nas definições disponíveis nesta conversa. Antes de publicar, revise `public/index.html` e confirme se os textos e opções das 15 perguntas são exatamente os que você aprovou anteriormente. Não colete dados reais até configurar o banco, os segredos e o aviso de privacidade.

## Publicação (resumo)
1. Crie um projeto Cloudflare Pages conectado a um repositório Git, ou use Wrangler.
2. Crie um banco D1: `npx wrangler d1 create cadastro-clinica-cheia`
3. Copie o `database_id` retornado para `wrangler.toml`.
4. Execute o schema: `npx wrangler d1 execute cadastro-clinica-cheia --remote --file=./schema.sql`
5. Configure os secrets `ADMIN_TOKEN` e `PRIVACY_NOTICE_URL`/aviso de privacidade conforme necessário nas configurações do projeto.
6. Faça deploy. Depois de publicado, o link público será o domínio `*.pages.dev` mostrado pelo Cloudflare.

## Segurança administrativa
O endpoint `/api/admin/export.csv` exige `Authorization: Bearer <ADMIN_TOKEN>`. Nunca exponha esse token no HTML ou no repositório público.


## Integração com WhatsApp Cloud API
Configure estes secrets/variáveis no ambiente de produção do Cloudflare Pages:
- `WHATSAPP_TOKEN`: token de acesso da Meta (secret).
- `WHATSAPP_PHONE_NUMBER_ID`: ID do número habilitado na Cloud API.
- `WHATSAPP_TEMPLATE_NAME`: nome exato do template aprovado.
- `WHATSAPP_TEMPLATE_LANGUAGE`: normalmente `pt_BR`.
- `EBOOK_PUBLIC_URL`: URL HTTPS pública do PDF.
- `META_GRAPH_API_VERSION`: versão Graph API ativa na sua conta (opcional; padrão atual no código `v23.0`, atualize conforme o painel/documentação da Meta).

O template configurado pelo código espera duas variáveis no corpo, nesta ordem: `{{1}}` = primeiro nome; `{{2}}` = URL pública do e-book. Crie e submeta para aprovação um template de utilidade apropriado à entrega solicitada, por exemplo:

"Olá, {{1}}! Aqui está o e-book Clínica Cheia, Faturamento Maior?: {{2}}. Obrigada pelo seu cadastro!"

A mensagem de entrega solicitada não depende da caixa opcional de marketing. Não envie conteúdos promocionais sem a autorização comercial separada. A API pode aceitar a solicitação sem garantir a entrega final; para confirmação de entrega real, configure também webhooks de status. A tela diferencia envio aceito, falha e integração ainda não configurada.
