import { Injectable, signal, computed } from '@angular/core';
import { Subject } from 'rxjs';

interface LayoutConfig {
    darkTheme: boolean;
    // Add other properties as needed
}

interface MenuStateChange {
    key: string;
    routeEvent?: boolean;
}

@Injectable({
  providedIn: 'root' // Global service
})
export class LayoutService {
  // Signal based configuration
  layoutConfig = signal<LayoutConfig>({
    darkTheme: false
  });

  // Computed property for dark theme status
  isDarkTheme = computed(() => this.layoutConfig().darkTheme);

  // Observables for menu state
  private menuSource = new Subject<MenuStateChange>();
  menuSource$ = this.menuSource.asObservable();

  private resetSource = new Subject<void>();
  resetSource$ = this.resetSource.asObservable();

  private configUpdate = new Subject<LayoutConfig>();
  configUpdate$ = this.configUpdate.asObservable();

  // Method to update config
  updateConfig(config: Partial<LayoutConfig>) {
    this.layoutConfig.update(current => {
        const newState = { ...current, ...config };
        this.configUpdate.next(newState);
        return newState;
    });
  }

  // Handler for menu toggles
  onMenuToggle() {
      // Logic for menu toggle if needed
  }

  // Method to fire menu state changes
  onMenuStateChange(event: MenuStateChange) {
      this.menuSource.next(event);
  }

  // Reset menu
  reset() {
      this.resetSource.next();
  }
}
