const Anthropic = require('@anthropic-ai/sdk');

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

function requireConfigured() {
  if (!client) {
    const err = new Error('AI support is not configured on this server (ANTHROPIC_API_KEY missing)');
    err.status = 503;
    throw err;
  }
}

const TROUBLESHOOT_TOOL = {
  name: 'provide_support_guidance',
  description: 'Structured troubleshooting guidance for a call-center agent handling a customer issue.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'One-sentence summary of the likely issue' },
      suggestedSteps: { type: 'array', items: { type: 'string' }, description: 'Ordered troubleshooting steps for the agent to walk the customer through' },
      suggestedAction: {
        type: 'string',
        enum: ['resolve_now', 'assign_technician', 'escalate_to_admin', 'no_action_needed'],
        description: 'What the agent should do next. Use assign_technician only if the issue requires physical intervention (device fault, installation, hardware).'
      },
      reasoning: { type: 'string', description: 'Brief reasoning for the suggested action' }
    },
    required: ['summary', 'suggestedSteps', 'suggestedAction', 'reasoning']
  }
};

const ORDER_INTENT_TOOL = {
  name: 'extract_order_intent',
  description: 'Extract a structured water-tanker order from a call-center agent\'s natural-language description of what the customer wants. Only extract what was clearly stated -- never guess a product or quantity that wasn\'t mentioned.',
  input_schema: {
    type: 'object',
    properties: {
      confident: { type: 'boolean', description: 'True only if the request is unambiguous enough to place the order without asking the customer anything else' },
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['large_tanker', 'small_tanker', 'water_bottles'] },
            quantity: { type: 'integer', minimum: 1 }
          },
          required: ['type', 'quantity']
        }
      },
      deliveryType: { type: 'string', enum: ['immediate', 'scheduled'] },
      clarifyingQuestion: { type: 'string', description: 'If not confident, the single most important question to ask the customer/agent next' }
    },
    required: ['confident', 'items']
  }
};

class AiSupportService {
  // SRS §7: "AI assistant provides troubleshooting guidance and structured
  // support suggestions." Context is whatever the agent has on hand (ticket
  // text, device status, order history) -- deliberately not fetched here so
  // this stays a pure text-in/structured-out call the controller assembles.
  async troubleshoot(context) {
    requireConfigured();

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: 'You are a support-triage assistant for AabRahat, a water-tanker delivery platform with IoT tank-level sensors. Given a customer issue, call provide_support_guidance with concrete, specific steps -- not generic advice. Recommend assign_technician only for hardware/device/installation problems that cannot be resolved remotely.',
      tools: [TROUBLESHOOT_TOOL],
      tool_choice: { type: 'tool', name: 'provide_support_guidance' },
      messages: [{ role: 'user', content: context }]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      const err = new Error('AI did not return structured guidance');
      err.status = 502;
      throw err;
    }
    return toolUse.input;
  }

  // SRS §7: "AI-assisted order placement must follow the same pricing,
  // availability and payment rules as the customer app." This only extracts
  // *what the customer wants* from natural language -- the caller is
  // responsible for actually placing the order through the same
  // orderService.createOrder() the customer app uses, so pricing/
  // availability/payment logic is never duplicated or re-implemented here.
  async parseOrderIntent(description) {
    requireConfigured();

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
      system: 'You are helping a call-center agent place a water-tanker order on behalf of a customer, based on what the agent typed after talking to the customer. Available products: large_tanker (6000L), small_tanker (3500L), water_bottles (20L each). Call extract_order_intent. If the request is vague (e.g. no clear product or quantity), set confident to false and ask a clarifying question instead of guessing.',
      tools: [ORDER_INTENT_TOOL],
      tool_choice: { type: 'tool', name: 'extract_order_intent' },
      messages: [{ role: 'user', content: description }]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      const err = new Error('AI did not return structured order intent');
      err.status = 502;
      throw err;
    }
    return toolUse.input;
  }
}

module.exports = new AiSupportService();
