import { spawn } from 'child_process';
import { logger } from '@/utils/logger';
import path from 'path';

export interface ConversationResponse {
  type: string;
  message: string;
  artists?: any[];
  new_artists?: any[];
  conversation_tips?: string[];
  removed_artists?: string[];
  total_count?: number;
  similarity_targets?: string[];
  preferred_genres?: string[];
  disliked_genres?: string[];
  follower_preference?: any;
  artist_details?: any;
  suggestions?: string[];
}

export interface EmailScrapingResult {
  artist: string;
  hasEmail: boolean;
  emailStatus: 'found' | 'not_found' | 'checking' | 'error';
  contactInfo: {
    email?: string;
    socialLinks?: string[];
    website?: string;
  };
}

export class ConversationalAIService {
  private pythonScriptPath: string;
  private pythonInterpreter: string;
  
  constructor() {
    this.pythonScriptPath = path.join(process.cwd(), '../scraping/src/cli_interface.py');
    this.pythonInterpreter = path.join(process.cwd(), '../scraping/venv/bin/python3');
  }

  async startConversation(sessionId: string, initialPrompt: string, exclusionContext?: any): Promise<ConversationResponse> {
    try {
      logger.info(`Starting AI conversation ${sessionId} with prompt: "${initialPrompt}"`);
      
      const result = await this.executePythonScript('start_conversation', {
        session_id: sessionId,
        initial_prompt: initialPrompt,
        exclusion_context: exclusionContext || {}
      });

      return result as ConversationResponse;
    } catch (error) {
      logger.error('Error starting AI conversation:', error);
      throw new Error('Failed to start conversation with AI');
    }
  }

  async continueConversation(sessionId: string, message: string): Promise<ConversationResponse> {
    try {
      logger.info(`Continuing AI conversation ${sessionId} with message: "${message}"`);
      
      const result = await this.executePythonScript('continue_conversation', {
        session_id: sessionId,
        message: message
      });

      return result as ConversationResponse;
    } catch (error) {
      logger.error('Error continuing AI conversation:', error);
      throw new Error('Failed to process conversation message');
    }
  }

  async scrapeArtistEmails(artistNames: string[]): Promise<EmailScrapingResult[]> {
    try {
      logger.info(`Scraping emails for ${artistNames.length} artists: ${JSON.stringify(artistNames)}`);
      logger.info(`Python interpreter path: ${this.pythonInterpreter}`);
      logger.info(`Python script path: ${this.pythonScriptPath}`);
      
      const result = await this.executePythonScript('scrape_emails', {
        artist_names: artistNames
      });

      logger.info(`Scraping completed, result: ${JSON.stringify(result)}`);
      return result.results as EmailScrapingResult[];
    } catch (error) {
      logger.error('Error scraping artist emails:', error);
      throw new Error('Failed to scrape artist emails');
    }
  }

  async getConversationSummary(sessionId: string): Promise<any> {
    try {
      const result = await this.executePythonScript('get_summary', {
        session_id: sessionId
      });

      return result;
    } catch (error) {
      logger.error('Error getting conversation summary:', error);
      throw new Error('Failed to get conversation summary');
    }
  }

  private async executePythonScript(action: string, parameters: any): Promise<any> {
    return new Promise((resolve, reject) => {
      logger.info(`Executing Python script with action: ${action}`);
      logger.info(`Parameters: ${JSON.stringify(parameters)}`);
      
      const python = spawn(this.pythonInterpreter, [this.pythonScriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        logger.info('Python stdout:', output);
      });

      python.stderr.on('data', (data) => {
        const error = data.toString();
        stderr += error;
        logger.info('Python stderr:', error);
      });

      python.on('close', (code) => {
        logger.info(`Python script closed with code: ${code}`);
        logger.info(`Full stdout: ${stdout}`);
        logger.info(`Full stderr: ${stderr}`);
        
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            logger.info('Successfully parsed Python output');
            resolve(result);
          } catch (parseError) {
            logger.error('Failed to parse Python script output:', parseError);
            logger.error('Raw output:', stdout);
            reject(new Error('Invalid response from AI service'));
          }
        } else {
          logger.error('Python script error:', stderr);
          reject(new Error(`AI service failed with code ${code}: ${stderr}`));
        }
      });

      python.on('error', (error) => {
        logger.error('Failed to start Python script:', error);
        reject(new Error(`Failed to start AI service: ${error.message}`));
      });

      // Send input to Python script
      const input = JSON.stringify({
        action: action,
        parameters: parameters
      });
      
      logger.info(`Sending input to Python: ${input}`);
      python.stdin.write(input);
      python.stdin.end();
    });
  }
}