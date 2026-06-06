import OpenAI from 'openai';
import { type Category } from '../../src/types';

let _openai: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!_openai) {
    const apiKey = process.env.APIMART_API_KEY;
    if (!apiKey) {
      throw new Error('APIMART_API_KEY is not set in environment variables');
    }
    _openai = new OpenAI({
      baseURL: 'https://api.apimart.ai/v1',
      apiKey,
    });
  }
  return _openai;
}

const CATEGORY_PROMPT = `
You are a highly intelligent product categorization assistant for a retail store.
You must classify the given product into exactly ONE of the following category IDs based on its name and description.

Available Category IDs:
- hot (推荐爆款, commonly used for popular or top-selling generic items)
- dragon_boat (端午礼品, zongzi, dragon boat festival gifts)
- snacks (休闲零食, chips, candies, chocolates, nuts)
- bakery (面包烘焙, breads, cakes, pastries, desserts)
- fresh (生鲜水果, fresh fruits, vegetables, raw meats, seafood)
- frozen (速食冻品, frozen foods, ice cream, frozen dumplings, ready-to-heat frozen meals)
- grain_oil (粮油干货, rice, cooking oil, noodles, spices, dried mushrooms)
- pets (萌宠生活, pet food, pet supplies, dog/cat items)
- baby (母婴用品, baby formula, diapers, baby care products)
- lifestyle (品质生活, paper towels, shampoo, body wash, toothpaste, household goods)
- drinks (酒水饮料, bottled water, juices, sodas, milk, coffee, tea, wine, alcohol)

Rules:
1. ONLY output the exact category ID string from the list above.
2. DO NOT output any other text, reasoning, or punctuation.
3. If unsure, fallback to 'hot'.
`;

export async function categorizeProductWithLLM(name: string, description: string): Promise<string> {
  const client = getOpenAIClient();
  const prompt = `Product Name: ${name}\nDescription: ${description || 'No description'}\n\nCategory ID:`;
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o', // Or claude-3-5-sonnet-latest, gemini-2.0-flash
    messages: [
      { role: 'system', content: CATEGORY_PROMPT },
      { role: 'user', content: prompt }
    ],
    temperature: 0.1,
    max_tokens: 10,
  });

  const content = response.choices[0]?.message?.content?.trim() || 'hot';
  
  // Clean up any potential markdown or extra spaces
  const cleaned = content.replace(/[^a-z_]/gi, '').toLowerCase();
  
  const validCategories = [
    'hot', 'dragon_boat', 'snacks', 'bakery', 'fresh', 'frozen', 
    'grain_oil', 'pets', 'baby', 'lifestyle', 'drinks'
  ];
  
  if (validCategories.includes(cleaned)) {
    return cleaned;
  }
  
  return 'hot';
}
