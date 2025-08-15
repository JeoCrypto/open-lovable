/**
 * Clean debug output and unwanted text from generated code content
 */
export class ContentCleaner {
  
  /**
   * Remove common debug patterns from code content
   */
  static cleanCodeContent(content: string): string {
    let cleaned = content;
    
    // Remove API status messages
    cleaned = cleaned.replace(/GET \/api\/[^\s]+ \d+ in \d+ms\s*/g, '');
    
    // Remove compilation messages
    cleaned = cleaned.replace(/✓ Compiled in \d+ms\s*/g, '');
    
    // Remove conversation state messages
    cleaned = cleaned.replace(/\[conversation-state\] [^\n]*\n?/g, '');
    
    // Remove create-ai-sandbox messages
    cleaned = cleaned.replace(/\[create-ai-sandbox\] [^\n]*\n?/g, '');
    
    // Remove POST/GET request logs
    cleaned = cleaned.replace(/POST \/[^\s]+ \d+ in \d+ms\s*/g, '');
    
    // Remove other common patterns
    cleaned = cleaned.replace(/\[generate-ai-code-stream\] [^\n]*\n?/g, '');
    cleaned = cleaned.replace(/\[apply-ai-code-stream\] [^\n]*\n?/g, '');
    
    // Remove sandbox status logs that got mixed in
    cleaned = cleaned.replace(/Starting to clone [^\n]*\n?/g, '');
    cleaned = cleaned.replace(/Failed to clone [^\n]*\n?/g, '');
    
    // Remove random HTTP error codes that got mixed in
    cleaned = cleaned.replace(/\s*\d{3}\s+in\s+\d+ms\s*/g, '');
    
    // Clean up multiple newlines
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }
  
  /**
   * Clean specific patterns found in JSX/React components
   */
  static cleanJSXContent(content: string): string {
    let cleaned = this.cleanCodeContent(content);
    
    // Fix broken JSX that got debug text inserted
    cleaned = cleaned.replace(/const\s+images\s+GET[^=]*=\s*\[/, 'const images = [');
    
    // Remove debug text from phone numbers or contact info
    cleaned = cleaned.replace(/(\+351\s*962\s*458\s*84)GET[^3]*3/, '$1 3');
    cleaned = cleaned.replace(/(\+351\s*962\s*458\s*84)\s*✓[^3]*3/, '$1 3');
    
    // Fix email addresses that got corrupted
    cleaned = cleaned.replace(/(karting@placocelos\.pt).*?([<\s])/, '$1$2');
    
    // Remove compilation status from text content
    cleaned = cleaned.replace(/All Rights GET[^R]*Reserved/, 'All Rights Reserved');
    
    return cleaned;
  }
}