type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class HarnessLogger {
  private logs: Array<{time: string, level: LogLevel, context: string, message: any, data?: any}> = [];
  
  private write(level: LogLevel, context: string, message: any, data?: any) {
    const entry = { time: new Date().toISOString(), level, context, message, data };
    this.logs.push(entry);
    
    const color = level === 'ERROR' ? '#ef4444' : level === 'WARN' ? '#f59e0b' : level === 'INFO' ? '#3b82f6' : '#9ca3af';
    console.log(`%c[${level}]%c ${context}:`, `color: ${color}; font-weight: bold;`, 'color: inherit;', message, data ? data : '');
    
    if (this.logs.length > 500) this.logs.shift(); // Keep last 500 lines
    
    try { 
      // Synchronous offline journaling
      localStorage.setItem('harness-system-logs', JSON.stringify(this.logs));
    } catch (e) {
      // Ignore quota errors
    }
  }

  debug(context: string, message: any, data?: any) { this.write('DEBUG', context, message, data); }
  info(context: string, message: any, data?: any) { this.write('INFO', context, message, data); }
  warn(context: string, message: any, data?: any) { this.write('WARN', context, message, data); }
  error(context: string, message: any, data?: any) { this.write('ERROR', context, message, data); }
  
  getHistory() { return this.logs; }
  clear() { this.logs = []; localStorage.removeItem('harness-system-logs'); }
}

export const logger = new HarnessLogger();

// Expose globally for headless subagent debugging 
if (typeof window !== 'undefined') {
  (window as any).harnessLogger = logger;
}
