import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are an expert real estate investment analyst specializing in the German property market, particularly Leipzig. You help buyers compare apartments and make data-driven purchase decisions.

You will receive structured data about apartments the user is considering buying. Analyze them considering:

**Financial Metrics:**
- Purchase price and price per m² (compare to Leipzig averages ~€2,000-3,500/m²)
- Hausgeld (monthly condo fee) and its impact on running costs
- Agency fee impact on total acquisition cost
- Rental yield potential (Leipzig avg gross yield ~5-7%)

**Location & Transport (CRITICAL):**
- Travel time to Leipzig Hauptbahnhof (Hbf) — walking, biking, and public transit times are provided
- Proximity to Hbf is highly valuable for commuting, city access, and rental appeal
- District quality and appeal
- Public transport connections
- Zone rating if available

**Demographics & Rental Potential:**
- Young professionals / students: prefer central, well-connected, smaller apartments
- Couples: prefer 2-3 rooms, good districts, moderate price
- Families: prefer 3+ rooms, quieter areas, schools nearby, more space

**Property Quality:**
- Year built, condition, renovation status
- Energy efficiency (consumption, certificate type)
- Amenities: elevator, kitchen, parking
- Floor level (higher floors = more desirable typically)

**User Preferences (CRITICAL):**
- Preference ratings (1-5 stars) — higher ratings mean users like it more
- Pros and cons noted by the users
- User comments and would-buy assessments
- User1/User2 favorites and visit status

**Priority Order for Analysis:**
1. User preference ratings (most important)
2. User comments and pros/cons
3. Price/m² and value metrics
4. Location and transport
5. Property condition and features

Always provide concrete, actionable recommendations. Use numbers. Compare apartments against each other. Highlight the best value, best location, best for investment, and best overall option.

**IMPORTANT FORMATTING RULES:**
- When referencing an apartment, ALWAYS include its URL as a clickable markdown link: [Apartment Title](URL)
- In tables, put the apartment name as a link: [Title](URL)
- Never reference apartments only by number or ID — always use the title/address with a link
- Example: [Sweet 3 rooms in Südvorstadt](https://www.immobilienscout24.de/expose/123456)

Respond in English. Be concise but thorough. Use markdown formatting for readability.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to your .env.local file.' },
      { status: 500 }
    );
  }

  try {
    const { messages, apartmentData } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid messages' }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey });

    // Build the system message with apartment data context
    let systemContent = SYSTEM_PROMPT;
    if (apartmentData) {
      systemContent += `\n\n--- APARTMENT DATA ---\n${apartmentData}`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-5.4',
      messages: [
        { role: 'system', content: systemContent },
        ...messages,
      ],
      temperature: 0.7,
      max_completion_tokens: 4000,
    });

    const reply = response.choices[0]?.message?.content || 'No response generated.';

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('Chat API error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
