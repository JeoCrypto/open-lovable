interface ErrorPattern {
  pattern: RegExp;
  type: 'css' | 'hydration' | 'syntax' | 'build' | 'runtime';
  autoFix?: (error: string) => AutoFix | null;
  description: string;
}

interface AutoFix {
  file: string;
  fix: string;
  explanation: string;
  manual?: boolean;
}

export class ErrorMonitor {
  private errorPatterns: ErrorPattern[] = [
    {
      pattern: /\[postcss\].*Unknown word.*```css/,
      type: 'css',
      description: 'CSS file contains markdown syntax',
      autoFix: (error: string) => {
        const fileMatch = error.match(/\/([^:]+\.css)/);
        if (!fileMatch) return null;
        
        return {
          file: fileMatch[1],
          fix: 'Remove markdown code blocks from CSS file',
          explanation: 'CSS files should not contain markdown syntax like ```css',
          manual: false
        };
      }
    },
    {
      pattern: /hydrated but some attributes.*didn't match/,
      type: 'hydration',
      description: 'React hydration mismatch',
      autoFix: () => ({
        file: 'app/layout.tsx',
        fix: 'Add suppressHydrationWarning to affected elements',
        explanation: 'Browser extensions or client-only code causing hydration mismatch',
        manual: false
      })
    },
    {
      pattern: /WritableStream is closed|Invalid state.*WritableStream/,
      type: 'runtime',
      description: 'Stream handling error',
      autoFix: (error: string) => {
        const fileMatch = error.match(/at.*\(([^:]+\.ts):(\d+):(\d+)\)/);
        if (!fileMatch) return null;
        
        return {
          file: fileMatch[1],
          fix: 'Add proper stream state checks before closing',
          explanation: 'Stream was already closed or locked when attempting to close',
          manual: false
        };
      }
    },
    {
      pattern: /Firecrawl API error.*Invalid url|Invalid URL|Invalid URL format/,
      type: 'runtime',
      description: 'Invalid URL format for Firecrawl API',
      autoFix: (error: string) => {
        return {
          file: 'app/api/scrape-url-enhanced/route.ts',
          fix: 'Extract and validate URL from user input',
          explanation: 'URL extraction improved to handle URLs embedded in prompts',
          manual: false
        };
      }
    },
    {
      pattern: /Cannot find module|Module not found/,
      type: 'build',
      description: 'Missing module dependency',
      autoFix: (error: string) => {
        const moduleMatch = error.match(/['"]([^'"]+)['"]/);
        if (!moduleMatch) return null;
        
        return {
          file: 'package.json',
          fix: `npm install ${moduleMatch[1]}`,
          explanation: `Missing dependency: ${moduleMatch[1]}`,
          manual: true
        };
      }
    },
    {
      pattern: /Unexpected token|SyntaxError/,
      type: 'syntax',
      description: 'JavaScript/TypeScript syntax error',
      autoFix: (error: string) => {
        const fileMatch = error.match(/at\s+([^:]+\.(jsx?|tsx?))/);
        if (!fileMatch) return null;
        
        return {
          file: fileMatch[1],
          fix: 'Review and fix syntax error',
          explanation: 'Syntax error detected in file',
          manual: true
        };
      }
    }
  ];

  detectError(errorMessage: string): ErrorPattern | null {
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return pattern;
      }
    }
    return null;
  }

  async autoFix(errorMessage: string): Promise<AutoFix | null> {
    const errorPattern = this.detectError(errorMessage);
    if (!errorPattern || !errorPattern.autoFix) {
      return null;
    }
    
    return errorPattern.autoFix(errorMessage);
  }

  getErrorType(errorMessage: string): string {
    const pattern = this.detectError(errorMessage);
    return pattern ? pattern.type : 'unknown';
  }
}

export const errorMonitor = new ErrorMonitor();