import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini client lazily (after .env is loaded)
let genAI = null;

const getGenAI = () => {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here' || apiKey.trim() === '') {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file. Get your key from: https://makersuite.google.com/app/apikey');
    }
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
};

export const generateSummary = async (content, type) => {
  try {
    // Get or initialize Gemini client (checks API key at runtime)
    const client = getGenAI();

    // Use gemini-pro as default (widely available) or gemini-1.5-flash (faster, newer)
    // Available models: gemini-pro, gemini-1.5-flash, gemini-1.5-pro-latest
    const modelName = process.env.GEMINI_MODEL || 'gemini-pro';
    const model = client.getGenerativeModel({ 
      model: modelName
    });

    const systemPrompt = type === 'chat'
      ? `You are an AI assistant that creates concise, structured summaries of group chat conversations. 
Analyze the conversation and provide:
1. A brief summary of the main discussion points at least 100 words long
2. Key topics discussed (as a bulleted list)
3. Action items or next steps (as a bulleted list)

Format your response as JSON with the following structure:
{
  "content": "Brief summary text here",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "actionItems": ["action1", "action2"]
}`
      : `You are an AI assistant that creates concise, structured summaries of documents. 
Analyze the document content and provide:
1. A brief summary of the document
2. Key topics covered (as a bulleted list)
3. Action items or important points (as a bulleted list)

Format your response as JSON with the following structure:
{
  "content": "Brief summary text here",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "actionItems": ["action1", "action2"]
}`;

    const userPrompt = type === 'chat'
      ? `Please summarize the following group chat conversation:\n\n${content}`
      : `Please summarize the following document:\n\n${content}`;

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;

    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const responseText = response.text();

    // Try to parse JSON from response
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/) || 
                       responseText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : responseText;
      const parsed = JSON.parse(jsonText.trim());
      
      return {
        content: parsed.content || responseText,
        keyTopics: parsed.keyTopics || [],
        actionItems: parsed.actionItems || [],
      };
    } catch (parseError) {
      // If JSON parsing fails, return the text as content
      console.warn('Failed to parse Gemini response as JSON, using raw text');
      return {
        content: responseText,
        keyTopics: [],
        actionItems: [],
      };
    }
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate summary: ' + (error.message || 'Unknown error'));
  }
};

