import { logger } from '@/utils/logger';

export interface AIArtistSuggestion {
  name: string;
  reason: string;
  genre: string;
  similarTo: string[];
  estimatedFollowers: string;
  webSearchResults?: string;
}

export class AIService {
  private readonly OLLAMA_BASE_URL = 'http://localhost:11434';
  private readonly MODEL = 'llama3.2:1b';

  private async searchWeb(query: string): Promise<string> {
    try {
      // Use DuckDuckGo search (no API key required)
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      
      // Extract search result snippets (simplified parsing)
      const resultRegex = /<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
      const matches = [...html.matchAll(resultRegex)];
      
      const snippets = matches
        .map(match => match[1])
        .filter(snippet => snippet && snippet.length > 20)
        .slice(0, 5) // Take top 5 results
        .map(snippet => snippet.replace(/<[^>]*>/g, '').trim())
        .join('\n');

      return snippets || 'No search results found';
    } catch (error) {
      logger.error('Web search error:', error);
      return 'Web search unavailable';
    }
  }

  async generateArtistRecommendations(prompt: string, count: number = 10): Promise<AIArtistSuggestion[]> {
    try {
      logger.info(`Starting AI artist recommendation for prompt: "${prompt}"`);

      // Step 1: Search the web for current artist information
      const searchQueries = [
        `${prompt} electronic music artists 2024`,
        `${prompt} similar artists recommendations`,
        `${prompt} music producers soundcloud spotify`,
        `new ${prompt} artists emerging talent`
      ];

      const searchResults: string[] = [];
      for (const query of searchQueries) {
        logger.info(`Searching web for: ${query}`);
        const results = await this.searchWeb(query);
        if (results && results !== 'No search results found') {
          searchResults.push(`Query: ${query}\n${results}`);
        }
        // Small delay to be respectful to search engines
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const webContext = searchResults.join('\n\n---\n\n');
      logger.info(`Gathered web search results, total length: ${webContext.length} characters`);

      // Step 2: Let AI think about the search results and generate recommendations
      const systemPrompt = `You are a music industry AI assistant with access to current web search results about electronic music artists. 

Your task is to analyze the web search results I provide and use your knowledge to recommend real, current electronic music artists.

THINK STEP BY STEP:
1. Analyze the user's request and the web search data
2. Identify real artist names mentioned in the search results  
3. Consider current trends and emerging artists
4. Make thoughtful recommendations based on the actual data
5. Provide specific reasons based on what you found

Be creative and think outside the box, but base your recommendations on:
- Real artists found in search results
- Current music scene insights from the web data
- Your knowledge of electronic music genres and scenes
- Emerging vs established artist balance

Return your response as a JSON array with this exact format:
[
  {
    "name": "Real Artist Name",
    "reason": "Specific reason based on search results or music knowledge",
    "genre": "Specific genre",
    "similarTo": ["Artist1", "Artist2"],
    "estimatedFollowers": "10K-50K" or "50K-100K" or "100K-500K" or "500K+"
  }
]

Focus on discovering real, current artists - not generic recommendations.`;

      const userPrompt = `User Request: "${prompt}"

Here are current web search results about electronic music artists:

${webContext}

Based on this web data and your knowledge, recommend ${count} real electronic music artists that match the user's request. Think creatively about the search results and find actual artists mentioned or related to the query.

Return only the JSON array - no other text.`;

      // Step 3: Send to local LLM
      const response = await fetch(`${this.OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.MODEL,
          prompt: `${systemPrompt}\n\n${userPrompt}`,
          stream: false,
          options: {
            temperature: 0.8, // Higher creativity
            top_p: 0.9,
            max_tokens: 3000,
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as { response: string };
      const aiResponse = data.response;

      logger.info('AI generated response based on web search');

      // Parse the AI response
      return this.parseAIResponse(aiResponse, webContext);

    } catch (error) {
      logger.error('AI Service error:', error);
      return this.getFallbackSuggestions(prompt, count);
    }
  }

  private async parseAIResponse(aiResponse: string, webContext: string): Promise<AIArtistSuggestion[]> {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      let suggestions: AIArtistSuggestion[] = [];
      
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // Try parsing the whole response
        suggestions = JSON.parse(aiResponse);
      }

      // Validate and enhance suggestions
      if (Array.isArray(suggestions)) {
        suggestions = suggestions
          .filter(s => s.name && s.reason && s.genre)
          .map(s => ({
            ...s,
            similarTo: Array.isArray(s.similarTo) ? s.similarTo : [],
            webSearchResults: webContext ? 'Based on current web search' : undefined
          }))
          .slice(0, 10); // Limit to 10 results

        logger.info(`Successfully parsed ${suggestions.length} AI-generated artist suggestions`);
        return suggestions;
      }
    } catch (parseError) {
      logger.error('Failed to parse AI response:', parseError);
    }

    // If parsing fails, return empty array (fallback will be called by caller)
    return [];
  }

  private getFallbackSuggestions(_prompt: string, count: number): AIArtistSuggestion[] {
    const fallbackArtists = [
      {
        name: "ODESZA",
        reason: "Melodic electronic duo known for emotional and atmospheric productions",
        genre: "Electronic",
        similarTo: ["Flume", "Porter Robinson"],
        estimatedFollowers: "500K+"
      },
      {
        name: "Flume",
        reason: "Innovative producer with experimental electronic sound design",
        genre: "Future Bass",
        similarTo: ["ODESZA", "What So Not"],
        estimatedFollowers: "500K+"
      },
      {
        name: "Porter Robinson",
        reason: "Emotional electronic music with melodic focus and storytelling",
        genre: "Electronic",
        similarTo: ["Madeon", "ODESZA"],
        estimatedFollowers: "500K+"
      },
      {
        name: "Madeon",
        reason: "French producer creating uplifting electronic music with pop influences",
        genre: "Electro Pop",
        similarTo: ["Porter Robinson", "Justice"],
        estimatedFollowers: "100K-500K"
      },
      {
        name: "What So Not",
        reason: "High-energy electronic music with trap and future bass elements",
        genre: "Future Bass",
        similarTo: ["Flume", "RL Grime"],
        estimatedFollowers: "100K-500K"
      },
      {
        name: "Kasbo",
        reason: "Swedish producer creating dreamy and melodic electronic music",
        genre: "Melodic Bass",
        similarTo: ["ODESZA", "Big Wild"],
        estimatedFollowers: "50K-100K"
      },
      {
        name: "Big Wild",
        reason: "Organic electronic music blending live instruments with electronic production",
        genre: "Electronic",
        similarTo: ["ODESZA", "GRiZ"],
        estimatedFollowers: "50K-100K"
      },
      {
        name: "Tycho",
        reason: "Ambient electronic music with organic textures and atmospheric soundscapes",
        genre: "Ambient Electronic",
        similarTo: ["Boards of Canada", "Emancipator"],
        estimatedFollowers: "100K-500K"
      }
    ];

    // Return random subset based on the requested count
    const shuffled = fallbackArtists.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, Math.min(count, fallbackArtists.length));
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.OLLAMA_BASE_URL}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}