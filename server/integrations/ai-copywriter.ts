import Anthropic from '@anthropic-ai/sdk';

interface LeadContext {
  nome: string;
  empresa: string;
  cargo: string;
  nicho?: string;
  dor?: string;
  pipelineStage?: string;
  previousInteractions?: string[];
}

function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function extractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

export async function generateEmail(
  context: LeadContext,
  tone: 'formal' | 'casual' | 'consultivo' = 'consultivo'
): Promise<{ subject: string; body: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Voce e um especialista em cold email B2B no Brasil. Gere um email personalizado de prospecao.

Dados do lead:
- Nome: ${context.nome}
- Empresa: ${context.empresa}
- Cargo: ${context.cargo}
${context.nicho ? `- Nicho: ${context.nicho}` : ''}
${context.dor ? `- Dor/necessidade: ${context.dor}` : ''}

Tom: ${tone}

REGRAS:
1. Use {nome}, {empresa}, {cargo} como variaveis de template - NAO substitua os valores
2. Maximo 120 palavras no body
3. Subject curto e chamativo (sem "Re:" ou spam words)
4. Foque em gerar curiosidade e uma pergunta no final

Responda APENAS em JSON valido: {"subject": "...", "body": "..."}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return extractJSON(text);
  } catch (err) {
    console.error('[AI Copywriter] generateEmail error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateFollowUp(
  context: LeadContext,
  previousMessages: string[]
): Promise<{ subject: string; body: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 600,
      messages: [{
        role: 'user',
        content: `Gere um email de follow-up B2B.

Lead: ${context.nome} - ${context.cargo} na ${context.empresa}
${context.nicho ? `Nicho: ${context.nicho}` : ''}

Mensagens anteriores enviadas:
${previousMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}

REGRAS:
1. Use {nome}, {empresa}, {cargo} como variaveis - NAO substitua
2. Referencia a mensagem anterior sem ser repetitivo
3. Maximo 80 palavras
4. Inclua uma pergunta direta

Responda APENAS em JSON: {"subject": "...", "body": "..."}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return extractJSON(text);
  } catch (err) {
    console.error('[AI Copywriter] generateFollowUp error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateWhatsAppMessage(
  context: LeadContext
): Promise<{ message: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Gere uma mensagem curta de WhatsApp para prospecao B2B no Brasil.

Lead: ${context.nome} - ${context.cargo} na ${context.empresa}
${context.nicho ? `Nicho: ${context.nicho}` : ''}
${context.dor ? `Dor: ${context.dor}` : ''}

REGRAS:
1. Use {nome}, {empresa} como variaveis - NAO substitua
2. Maximo 200 caracteres
3. Tom conversacional e direto
4. Pode usar 1 emoji
5. Termine com uma pergunta

Responda APENAS em JSON: {"message": "..."}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return extractJSON(text);
  } catch (err) {
    console.error('[AI Copywriter] generateWhatsApp error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function suggestNextStep(
  context: LeadContext,
  history: { channel: string; status: string; date: string }[]
): Promise<{ suggestion: string; reasoning: string } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Voce e um SDR experiente. Sugira o proximo passo para este lead.

Lead: ${context.nome} - ${context.cargo} na ${context.empresa}
Historico de contatos:
${history.map(h => `- ${h.date}: ${h.channel} → ${h.status}`).join('\n')}

Responda em JSON: {"suggestion": "descricao curta da acao", "reasoning": "porque esta e a melhor acao"}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return extractJSON(text);
  } catch (err) {
    console.error('[AI Copywriter] suggestNextStep error:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function generateCadenceSteps(
  nicho: string,
  dor: string,
  numSteps: number = 5
): Promise<{ steps: { delayDays: number; channel: string; templateSubject: string; templateBody: string }[] } | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `Crie uma cadencia de outbound com ${numSteps} passos para o nicho: "${nicho}".
Dor principal do publico: "${dor}"

Canais disponiveis: email, whatsapp, call, task, linkedin_manual

REGRAS:
1. Use {nome}, {empresa}, {cargo} como variaveis nos templates
2. Primeiro passo sempre email (delay 0 dias)
3. Varie os canais (nao use so email)
4. Delays crescentes (0, 2, 3, 5, 7...)
5. Ultimo passo e email de "break-up" gentil
6. Templates em portugues BR

Responda APENAS em JSON:
{"steps": [{"delayDays": 0, "channel": "email", "templateSubject": "...", "templateBody": "..."}, ...]}`
      }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return extractJSON(text);
  } catch (err) {
    console.error('[AI Copywriter] generateCadence error:', err instanceof Error ? err.message : err);
    return null;
  }
}
