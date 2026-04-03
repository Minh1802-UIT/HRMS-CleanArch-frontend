import sys

file_path = r"c:\VanMinh\side-project\HRMS\HRMS-CleanArch-frontend\src\app\features\recruitment\pages\recruitment\candidate-detail\candidate-detail.component.html"

with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# 1. Remove Score with AI button
ai_button_target = """                    <button
                      (click)="scoreWithAi()"
                      [disabled]="isScoring"
                      class="flex gap-2 items-center px-4 py-2 text-sm font-bold text-violet-700 bg-violet-50 rounded-lg border border-violet-200 shadow-sm transition-all hover:bg-violet-100 dark:bg-violet-900/20 dark:border-violet-800/50 dark:text-violet-300 dark:hover:bg-violet-900/40 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                      @if (isScoring) {
                        <span class="text-lg material-symbols-outlined animate-spin">sync</span>
                      } @else {
                        <span class="text-lg material-symbols-outlined">auto_awesome</span>
                      }
                      {{ isScoring ? 'Scoring...' : 'Score with AI' }}
                    </button>"""

text = text.replace(ai_button_target, "")

# 2. Remove Match Score Block
match_score_target = """                                  <!-- AI Score -->
                                  @if (candidate.aiScore !== undefined && candidate.aiScore !== null) {
                                    <div class="my-8 w-full h-px bg-gray-100 dark:bg-gray-700/50"></div>
                                    <div class="flex flex-col gap-3 items-center w-full bg-violet-50 dark:bg-violet-900/10 p-5 rounded-2xl border border-violet-100 dark:border-violet-900/30">
                                      <span class="text-xs text-violet-600 dark:text-violet-400 uppercase font-bold tracking-widest flex items-center gap-1.5">
                                        <span class="material-symbols-outlined text-sm">auto_awesome</span>
                                        Match Score
                                      </span>
                                      <div class="text-4xl font-black text-violet-700 dark:text-violet-300">
                                        {{ candidate.aiScore }}<span class="text-sm font-bold text-violet-500/70 ml-1">/ 100</span>
                                      </div>
                                    </div>
                                  }"""

text = text.replace(match_score_target, "")

# 3. Resume Tab replacement
# We can find the index of <!-- Resume Tab --> and <!-- History Tab -->
resume_idx = text.find("<!-- Resume Tab -->")
history_idx = text.find("<!-- History Tab -->")

if resume_idx != -1 and history_idx != -1:
    new_resume_block = """<!-- Resume Tab -->
                                                                                  @if (activeTab === 'resume') {
                                                                                    <div class="flex flex-col h-full animate-fade-in gap-8">
                                                                                      <div class="flex justify-end gap-3 mb-2">
                                                                                        <a
                                                                                          *ngIf="candidate.safeResumeUrl"
                                                                                          [href]="candidate.resumeUrl"
                                                                                          target="_blank"
                                                                                          class="px-4 py-2 text-xs font-bold uppercase tracking-widest text-brand-orange border-2 border-brand-orange/20 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-900/10 transition flex items-center gap-2 group shadow-sm hover:shadow-md"
                                                                                        >
                                                                                          <span class="text-base transition-transform material-symbols-outlined group-hover:-translate-y-0.5">open_in_new</span>
                                                                                          Open in New Tab
                                                                                        </a>
                                                                                      </div>
                                                                                      
                                                                                      <div class="flex flex-col flex-1 h-[800px] bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700">
                                                                                        @if (candidate.safeResumeUrl) {
                                                                                          <iframe
                                                                                            [src]="candidate.safeResumeUrl"
                                                                                            class="w-full h-full border-none"
                                                                                            title="Candidate CV"
                                                                                          ></iframe>
                                                                                        } @else {
                                                                                          <div class="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400 p-8 text-center space-y-4">
                                                                                            <span class="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600">hide_source</span>
                                                                                            <p class="font-bold text-lg text-gray-700 dark:text-gray-300">No CV / Resume Provided</p>
                                                                                            <p class="text-sm">There is no resume document link associated with this candidate.</p>
                                                                                          </div>
                                                                                        }
                                                                                      </div>
                                                                                    </div>
                                                                                  }
                                                                                  """
    
    # Check if there's any necessary whitespace before <!-- History Tab -->
    # We will just replace text[resume_idx : history_idx]
    text = text[:resume_idx] + new_resume_block + text[history_idx:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Modification done!")
