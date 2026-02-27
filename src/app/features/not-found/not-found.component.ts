import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="not-found-container">
      <div class="not-found-content">
        <span class="error-code">404</span>
        <h1>Page Not Found</h1>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <a routerLink="/dashboard" class="back-btn">
          <span class="icon">←</span> Back to Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [`
    .not-found-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
      font-family: 'Inter', 'Plus Jakarta Sans', system-ui, sans-serif;
    }
    :host-context(.dark) .not-found-container {
      background: linear-gradient(135deg, #09090b 0%, #18181b 100%);
    }
    .not-found-content {
      text-align: center;
      padding: 3rem 2rem;
    }
    .error-code {
      font-size: 8rem;
      font-weight: 900;
      line-height: 1;
      background: linear-gradient(135deg, #3b67f5, #8b5cf6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #18181b;
      margin: 1rem 0 0.5rem;
    }
    :host-context(.dark) h1 { color: #fafafa; }
    p {
      color: #71717a;
      font-size: 1.05rem;
      margin-bottom: 2rem;
    }
    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: #3b67f5;
      color: #fff;
      border-radius: 0.75rem;
      text-decoration: none;
      font-weight: 600;
      transition: background 0.2s, transform 0.15s;
    }
    .back-btn:hover {
      background: #2d52c9;
      transform: translateY(-1px);
    }
  `]
})
export class NotFoundComponent {}
