interface ProjectFile {
  path: string;
  content: string;
  type: string;
}

interface ProjectState {
  files: ProjectFile[];
  packages: string[];
  lastSaved: Date;
  projectName: string;
  sandboxId?: string;
}

export class ProjectPersistence {
  private static STORAGE_KEY = 'lovable_project_state';
  private static BACKUP_KEY = 'lovable_project_backup';
  
  /**
   * Save project state to browser's local storage
   */
  static saveProject(state: ProjectState): void {
    if (typeof window === 'undefined') return; // Server-side check
    
    try {
      const serialized = JSON.stringify({
        ...state,
        lastSaved: new Date().toISOString()
      });
      
      // Save to primary storage
      localStorage.setItem(this.STORAGE_KEY, serialized);
      
      // Keep a backup copy
      localStorage.setItem(this.BACKUP_KEY, serialized);
      
      console.log('[ProjectPersistence] Project saved successfully');
    } catch (error) {
      console.error('[ProjectPersistence] Failed to save project:', error);
    }
  }
  
  /**
   * Load project state from local storage
   */
  static loadProject(): ProjectState | null {
    if (typeof window === 'undefined') return null; // Server-side check
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        // Try to load from backup
        const backup = localStorage.getItem(this.BACKUP_KEY);
        if (backup) {
          console.log('[ProjectPersistence] Loading from backup');
          return JSON.parse(backup);
        }
        return null;
      }
      
      const state = JSON.parse(stored);
      console.log('[ProjectPersistence] Project loaded successfully');
      return state;
    } catch (error) {
      console.error('[ProjectPersistence] Failed to load project:', error);
      return null;
    }
  }
  
  /**
   * Save files from current generation progress
   */
  static saveFiles(files: ProjectFile[], packages: string[] = []): void {
    const existingState = this.loadProject() || {
      files: [],
      packages: [],
      projectName: 'PLC Karting',
      lastSaved: new Date()
    };
    
    // Merge new files with existing ones
    const fileMap = new Map<string, ProjectFile>();
    
    // Add existing files
    existingState.files.forEach(file => {
      fileMap.set(file.path, file);
    });
    
    // Update or add new files
    files.forEach(file => {
      fileMap.set(file.path, file);
    });
    
    // Merge packages
    const allPackages = [...new Set([...existingState.packages, ...packages])];
    
    this.saveProject({
      ...existingState,
      files: Array.from(fileMap.values()),
      packages: allPackages,
      lastSaved: new Date()
    });
  }
  
  /**
   * Check if there's a saved project
   */
  static hasProject(): boolean {
    if (typeof window === 'undefined') return false; // Server-side check
    return !!(localStorage.getItem(this.STORAGE_KEY) || localStorage.getItem(this.BACKUP_KEY));
  }
  
  /**
   * Clear saved project
   */
  static clearProject(): void {
    if (typeof window === 'undefined') return; // Server-side check
    
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.BACKUP_KEY);
    console.log('[ProjectPersistence] Project cleared');
  }
  
  /**
   * Export project as JSON file
   */
  static exportProject(): void {
    const state = this.loadProject();
    if (!state) {
      console.error('[ProjectPersistence] No project to export');
      return;
    }
    
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lovable-project-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * Import project from JSON file
   */
  static async importProject(file: File): Promise<boolean> {
    try {
      const text = await file.text();
      const state = JSON.parse(text) as ProjectState;
      
      if (!state.files || !Array.isArray(state.files)) {
        throw new Error('Invalid project file format');
      }
      
      this.saveProject(state);
      return true;
    } catch (error) {
      console.error('[ProjectPersistence] Failed to import project:', error);
      return false;
    }
  }
}