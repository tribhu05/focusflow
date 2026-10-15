/**
 * FocusFlow — Smart Study Planner & Focus Station
 * Pure Vanilla JavaScript (ES6+) Implementation
 * 
 * Features:
 * - Full CRUD for study tasks (title, category, priority, due date, pomodoros, notes)
 * - Safe localStorage persistence & auto-sync
 * - Multi-criteria search, category filter, status tabs, and multi-field sorting
 * - Accurate 25-min Pomodoro timer with refresh preservation & duplicate interval guard
 * - Web Audio API synthesized audio chime (zero external dependencies)
 * - Accessible keyboard shortcuts & responsive UI updates
 */

(function () {
  'use strict';

  // ==========================================================================
  // Storage Keys & Constants
  // ==========================================================================
  const STORAGE_KEYS = {
    TASKS: 'focusflow_tasks_v1',
    TIMER_STATE: 'focusflow_timer_state_v1',
    SETTINGS: 'focusflow_settings_v1',
    METRICS: 'focusflow_metrics_v1'
  };

  const TIMER_PRESETS = {
    focus: 25 * 60,       // 25 minutes in seconds
    shortBreak: 5 * 60,   // 5 minutes
    longBreak: 15 * 60    // 15 minutes
  };

  const PRIORITY_ORDER = {
    high: 3,
    medium: 2,
    low: 1
  };

  // Sample tasks for initial demo / empty state seeding
  const DEFAULT_SAMPLE_TASKS = [
    {
      id: 'task-sample-1',
      title: 'Review Chapter 4: Quantum Harmonic Oscillator & Hermite Polynomials',
      category: 'Revision',
      priority: 'high',
      dueDate: getRelativeDateString(0), // Today
      estSessions: 2,
      completedSessions: 1,
      notes: 'Focus on ladder operators and normalization integral steps.',
      completed: false,
      createdAt: Date.now() - 3600000 * 24,
      completedAt: null
    },
    {
      id: 'task-sample-2',
      title: 'Complete Algorithms Problem Set 3 — Dynamic Programming & Graphs',
      category: 'Problem Sets',
      priority: 'high',
      dueDate: getRelativeDateString(1), // Tomorrow
      estSessions: 3,
      completedSessions: 0,
      notes: 'Problems 1-4 on memoization tables; Problem 5 on Bellman-Ford.',
      completed: false,
      createdAt: Date.now() - 3600000 * 12,
      completedAt: null
    },
    {
      id: 'task-sample-3',
      title: 'Read Research Paper on Scalable Transformer Architectures',
      category: 'Reading',
      priority: 'medium',
      dueDate: getRelativeDateString(3),
      estSessions: 1,
      completedSessions: 0,
      notes: 'Take notes on flash attention benchmarks and memory footprint.',
      completed: false,
      createdAt: Date.now() - 3600000 * 8,
      completedAt: null
    },
    {
      id: 'task-sample-4',
      title: 'Synthesize Midterm Review Notes for Organic Chemistry',
      category: 'Exam Prep',
      priority: 'low',
      dueDate: getRelativeDateString(-1), // Completed yesterday
      estSessions: 2,
      completedSessions: 2,
      notes: 'Reaction mechanisms: SN1, SN2, E1, and E2 pathways summarized.',
      completed: true,
      createdAt: Date.now() - 3600000 * 48,
      completedAt: Date.now() - 3600000 * 10
    }
  ];

  // Helper: Return YYYY-MM-DD offset by days
  function getRelativeDateString(daysOffset) {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().split('T')[0];
  }

  // ==========================================================================
  // Application State
  // ==========================================================================
  let tasks = [];
  let filterStatus = 'all'; // 'all' | 'active' | 'completed'
  let searchQuery = '';
  let categoryFilter = 'all';
  let sortBy = 'dueDate';

  let settings = {
    soundEnabled: true
  };

  let dailyMetrics = {
    date: new Date().toISOString().split('T')[0],
    completedSessions: 0,
    totalFocusMinutes: 0
  };

  // Timer Runtime State
  let timer = {
    mode: 'focus',
    duration: TIMER_PRESETS.focus,
    remainingSeconds: TIMER_PRESETS.focus,
    isRunning: false,
    intervalId: null,
    targetEndTime: null,
    linkedTaskId: null
  };

  // ==========================================================================
  // DOM Elements Selection
  // ==========================================================================
  const DOM = {
    // Header
    currentDateBadge: document.getElementById('currentDateBadge'),
    headerDateText: document.getElementById('headerDateText'),
    soundToggleBtn: document.getElementById('soundToggleBtn'),
    soundIconOn: document.getElementById('soundIconOn'),
    soundIconOff: document.getElementById('soundIconOff'),
    openNewTaskBtn: document.getElementById('openNewTaskBtn'),

    // Timer Elements
    timerStatusPill: document.getElementById('timerStatusPill'),
    timerModeTabs: document.querySelectorAll('.mode-tab'),
    timerDisplay: document.getElementById('timerDisplay'),
    timerModeLabel: document.getElementById('timerModeLabel'),
    timerProgressRing: document.getElementById('timerProgressRing'),
    timerToggleBtn: document.getElementById('timerToggleBtn'),
    timerToggleBtnText: document.getElementById('timerToggleBtnText'),
    timerPlayIcon: document.getElementById('timerPlayIcon'),
    timerPauseIcon: document.getElementById('timerPauseIcon'),
    timerResetBtn: document.getElementById('timerResetBtn'),
    focusingOnBanner: document.getElementById('focusingOnBanner'),
    focusTaskName: document.getElementById('focusTaskName'),
    clearFocusTaskBtn: document.getElementById('clearFocusTaskBtn'),
    completedSessionsCount: document.getElementById('completedSessionsCount'),
    totalFocusMinutes: document.getElementById('totalFocusMinutes'),

    // Progress Stats
    completionRateText: document.getElementById('completionRateText'),
    progressBarFill: document.getElementById('progressBarFill'),
    statTotalTasks: document.getElementById('statTotalTasks'),
    statActiveTasks: document.getElementById('statActiveTasks'),
    statCompletedTasks: document.getElementById('statCompletedTasks'),

    // Toolbar & Filters
    taskSearchInput: document.getElementById('taskSearchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    categoryFilter: document.getElementById('categoryFilter'),
    taskSortSelect: document.getElementById('taskSortSelect'),
    statusTabs: document.querySelectorAll('.status-tab'),
    badgeAll: document.getElementById('badgeAll'),
    badgeActive: document.getElementById('badgeActive'),
    badgeCompleted: document.getElementById('badgeCompleted'),
    clearCompletedBtn: document.getElementById('clearCompletedBtn'),
    resetSampleTasksBtn: document.getElementById('resetSampleTasksBtn'),

    // Task List & Empty State
    taskList: document.getElementById('taskList'),
    emptyState: document.getElementById('emptyState'),
    emptyStateTitle: document.getElementById('emptyStateTitle'),
    emptyStateDesc: document.getElementById('emptyStateDesc'),
    emptyStateAddBtn: document.getElementById('emptyStateAddBtn'),

    // Modal
    taskModalBackdrop: document.getElementById('taskModalBackdrop'),
    modalTitle: document.getElementById('modalTitle'),
    closeModalBtn: document.getElementById('closeModalBtn'),
    cancelModalBtn: document.getElementById('cancelModalBtn'),
    taskForm: document.getElementById('taskForm'),
    taskIdInput: document.getElementById('taskIdInput'),
    taskTitleInput: document.getElementById('taskTitleInput'),
    titleErrorMsg: document.getElementById('titleErrorMsg'),
    taskCategoryInput: document.getElementById('taskCategoryInput'),
    taskPriorityInput: document.getElementById('taskPriorityInput'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskEstSessionsInput: document.getElementById('taskEstSessionsInput'),
    taskNotesInput: document.getElementById('taskNotesInput'),
    saveTaskBtn: document.getElementById('saveTaskBtn'),
    saveBtnText: document.getElementById('saveBtnText'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // Ring circumference for SVG r=92: 2 * PI * 92 ~= 578.05
  const RING_CIRCUMFERENCE = 2 * Math.PI * 92;

  // ==========================================================================
  // Initialization
  // ==========================================================================
  function init() {
    loadSettings();
    loadDailyMetrics();
    loadTasks();
    setupCurrentDate();
    initTimerFromStorage();
    attachEventListeners();
    renderTasks();
    renderMetrics();
    updateTimerDisplay();
  }

  // ==========================================================================
  // Persistence Layer
  // ==========================================================================
  function loadTasks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TASKS);
      if (stored) {
        tasks = JSON.parse(stored);
      } else {
        // Seed default sample tasks for first visit
        tasks = [...DEFAULT_SAMPLE_TASKS];
        saveTasks();
      }
    } catch (e) {
      console.error('Failed to parse tasks from localStorage', e);
      tasks = [...DEFAULT_SAMPLE_TASKS];
    }
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage', e);
      showToast('Storage quota exceeded or unavailable', 'danger');
    }
  }

  function loadSettings() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        settings = { ...settings, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Could not load settings', e);
    }
    updateSoundIcon();
  }

  function saveSettings() {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings', e);
    }
  }

  function loadDailyMetrics() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.METRICS);
      const today = new Date().toISOString().split('T')[0];
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          dailyMetrics = parsed;
        } else {
          // New day reset
          dailyMetrics = { date: today, completedSessions: 0, totalFocusMinutes: 0 };
          saveDailyMetrics();
        }
      }
    } catch (e) {
      console.warn('Could not load metrics', e);
    }
    updateDailyMetricsDisplay();
  }

  function saveDailyMetrics() {
    try {
      localStorage.setItem(STORAGE_KEYS.METRICS, JSON.stringify(dailyMetrics));
    } catch (e) {
      console.warn('Could not save metrics', e);
    }
    updateDailyMetricsDisplay();
  }

  function saveTimerState() {
    try {
      const stateToPersist = {
        mode: timer.mode,
        duration: timer.duration,
        remainingSeconds: timer.remainingSeconds,
        isRunning: timer.isRunning,
        targetEndTime: timer.targetEndTime,
        linkedTaskId: timer.linkedTaskId
      };
      localStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify(stateToPersist));
    } catch (e) {
      console.warn('Failed to save timer state', e);
    }
  }

  function initTimerFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TIMER_STATE);
      if (stored) {
        const saved = JSON.parse(stored);
        timer.mode = saved.mode || 'focus';
        timer.duration = saved.duration || TIMER_PRESETS[timer.mode] || TIMER_PRESETS.focus;
        timer.linkedTaskId = saved.linkedTaskId || null;

        if (saved.isRunning && saved.targetEndTime) {
          const now = Date.now();
          const diffSeconds = Math.round((saved.targetEndTime - now) / 1000);

          if (diffSeconds > 0) {
            // Timer was running when browser refreshed
            timer.remainingSeconds = diffSeconds;
            timer.targetEndTime = saved.targetEndTime;
            startTimer(false); // resume without recalculating targetEndTime
            return;
          } else {
            // Timer finished while page was closed
            timer.remainingSeconds = 0;
            timer.isRunning = false;
            handleTimerComplete();
            return;
          }
        } else {
          // Timer was paused or idle
          timer.remainingSeconds = typeof saved.remainingSeconds === 'number'
            ? saved.remainingSeconds
            : timer.duration;
          timer.isRunning = false;
        }
      } else {
        timer.mode = 'focus';
        timer.duration = TIMER_PRESETS.focus;
        timer.remainingSeconds = TIMER_PRESETS.focus;
      }
    } catch (e) {
      console.warn('Failed to parse timer state', e);
      timer.mode = 'focus';
      timer.duration = TIMER_PRESETS.focus;
      timer.remainingSeconds = TIMER_PRESETS.focus;
    }

    updateModeTabsUI();
    updateLinkedTaskUI();
  }

  // ==========================================================================
  // Date & Header Helpers
  // ==========================================================================
  function setupCurrentDate() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const todayFormatted = new Intl.DateTimeFormat('en-US', options).format(new Date());
    DOM.headerDateText.textContent = todayFormatted;
  }

  function updateSoundIcon() {
    if (settings.soundEnabled) {
      DOM.soundIconOn.classList.remove('hidden');
      DOM.soundIconOff.classList.add('hidden');
      DOM.soundToggleBtn.setAttribute('title', 'Sound Alerts: ON');
    } else {
      DOM.soundIconOn.classList.add('hidden');
      DOM.soundIconOff.classList.remove('hidden');
      DOM.soundToggleBtn.setAttribute('title', 'Sound Alerts: OFF');
    }
  }

  // ==========================================================================
  // Web Audio Synthesizer (Chime Alert)
  // ==========================================================================
  function playCompletionChime() {
    if (!settings.soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Note 1: E5 (659.25 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.9);

      // Note 2: B5 (987.77 Hz) - Harmonious interval
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(987.77, now + 0.15);

      gain2.gain.setValueAtTime(0, now + 0.15);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.15);
      osc2.stop(now + 1.2);

      // Note 3: E6 (1318.5 Hz) - Final resolution chime
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1318.5, now + 0.35);

      gain3.gain.setValueAtTime(0, now + 0.35);
      gain3.gain.linearRampToValueAtTime(0.3, now + 0.42);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);

      osc3.start(now + 0.35);
      osc3.stop(now + 1.6);
    } catch (e) {
      console.warn('Web Audio chime playback not permitted yet or failed', e);
    }
  }

  // ==========================================================================
  // Focus Timer Logic
  // ==========================================================================
  function setTimerMode(mode) {
    if (!TIMER_PRESETS[mode]) return;
    
    // Clear active running state
    clearInterval(timer.intervalId);
    timer.intervalId = null;
    timer.isRunning = false;
    timer.mode = mode;
    timer.duration = TIMER_PRESETS[mode];
    timer.remainingSeconds = timer.duration;
    timer.targetEndTime = null;

    saveTimerState();
    updateModeTabsUI();
    updateTimerDisplay();
  }

  function updateModeTabsUI() {
    DOM.timerModeTabs.forEach(tab => {
      const mode = tab.dataset.mode;
      const isActive = mode === timer.mode;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    if (timer.mode === 'focus') {
      DOM.timerModeLabel.textContent = 'Deep Study Session';
    } else if (timer.mode === 'shortBreak') {
      DOM.timerModeLabel.textContent = 'Rest & Recharge (5m)';
    } else if (timer.mode === 'longBreak') {
      DOM.timerModeLabel.textContent = 'Extended Break (15m)';
    }
  }

  function toggleTimer() {
    if (timer.isRunning) {
      pauseTimer();
    } else {
      startTimer(true);
    }
  }

  function startTimer(isNewOrResume) {
    // PREVENT DUPLICATE INTERVALS: ALWAYS CLEAR BEFORE SETTING
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }

    if (timer.remainingSeconds <= 0) {
      timer.remainingSeconds = timer.duration;
    }

    if (isNewOrResume || !timer.targetEndTime) {
      timer.targetEndTime = Date.now() + timer.remainingSeconds * 1000;
    }

    timer.isRunning = true;
    saveTimerState();
    updateTimerDisplay();

    // Start 1-second ticking interval
    timer.intervalId = setInterval(() => {
      const now = Date.now();
      const secondsLeft = Math.max(0, Math.round((timer.targetEndTime - now) / 1000));
      timer.remainingSeconds = secondsLeft;

      if (secondsLeft <= 0) {
        clearInterval(timer.intervalId);
        timer.intervalId = null;
        timer.isRunning = false;
        handleTimerComplete();
      }

      updateTimerDisplay();
    }, 1000);
  }

  function pauseTimer() {
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    timer.isRunning = false;
    timer.targetEndTime = null;
    saveTimerState();
    updateTimerDisplay();
    showToast('Timer paused', 'info');
  }

  function resetTimer() {
    if (timer.intervalId) {
      clearInterval(timer.intervalId);
      timer.intervalId = null;
    }
    timer.isRunning = false;
    timer.targetEndTime = null;
    timer.remainingSeconds = timer.duration;
    saveTimerState();
    updateTimerDisplay();
    showToast('Timer reset', 'info');
  }

  function handleTimerComplete() {
    playCompletionChime();

    if (timer.mode === 'focus') {
      // Record completed focus session
      dailyMetrics.completedSessions += 1;
      dailyMetrics.totalFocusMinutes += Math.round(timer.duration / 60);
      saveDailyMetrics();

      // If linked to a task, increment task session count
      if (timer.linkedTaskId) {
        const linked = tasks.find(t => t.id === timer.linkedTaskId);
        if (linked) {
          linked.completedSessions = (linked.completedSessions || 0) + 1;
          saveTasks();
          renderTasks();
          showToast(`Great work! Focus session finished on "${linked.title.substring(0, 30)}..."`, 'success');
        } else {
          showToast('Focus session complete! Time for a break.', 'success');
        }
      } else {
        showToast('Focus session complete! Excellent focus.', 'success');
      }
    } else {
      showToast('Break finished! Ready for the next study block?', 'info');
    }

    // Reset back to duration for current mode
    timer.remainingSeconds = timer.duration;
    timer.targetEndTime = null;
    saveTimerState();
    updateTimerDisplay();
  }

  function updateTimerDisplay() {
    const mins = Math.floor(timer.remainingSeconds / 60);
    const secs = timer.remainingSeconds % 60;
    const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    DOM.timerDisplay.textContent = formatted;

    // Update document title with remaining time
    if (timer.isRunning) {
      document.title = `(${formatted}) FocusFlow — Smart Study Planner`;
    } else {
      document.title = 'FocusFlow — Smart Study Planner';
    }

    // Toggle Play/Pause button icons and labels
    if (timer.isRunning) {
      DOM.timerToggleBtnText.textContent = 'Pause';
      DOM.timerPlayIcon.classList.add('hidden');
      DOM.timerPauseIcon.classList.remove('hidden');
      DOM.timerStatusPill.textContent = 'In Progress';
      DOM.timerStatusPill.className = 'tag-status active';
    } else {
      const isPartiallyDone = timer.remainingSeconds < timer.duration && timer.remainingSeconds > 0;
      DOM.timerToggleBtnText.textContent = isPartiallyDone ? 'Resume' : 'Start Focus';
      DOM.timerPlayIcon.classList.remove('hidden');
      DOM.timerPauseIcon.classList.add('hidden');
      DOM.timerStatusPill.textContent = isPartiallyDone ? 'Paused' : 'Ready';
      DOM.timerStatusPill.className = isPartiallyDone ? 'tag-status paused' : 'tag-status';
    }

    // SVG Circular Progress Ring Calculation
    // Stroke dash offset ranges from 0 (empty) to RING_CIRCUMFERENCE
    const progressFraction = timer.duration > 0 ? timer.remainingSeconds / timer.duration : 0;
    const offset = RING_CIRCUMFERENCE * (1 - progressFraction);
    DOM.timerProgressRing.style.strokeDashoffset = offset;
  }

  function linkTaskToTimer(taskId) {
    if (timer.linkedTaskId === taskId) {
      // Unlink if clicked again
      unlinkFocusTask();
      return;
    }

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    timer.linkedTaskId = taskId;
    saveTimerState();
    updateLinkedTaskUI();
    renderTasks();
    showToast(`Linked: "${task.title.substring(0, 32)}..."`, 'info');
  }

  function unlinkFocusTask() {
    timer.linkedTaskId = null;
    saveTimerState();
    updateLinkedTaskUI();
    renderTasks();
    showToast('Task unlinked from focus station', 'info');
  }

  function updateLinkedTaskUI() {
    if (timer.linkedTaskId) {
      const task = tasks.find(t => t.id === timer.linkedTaskId);
      if (task) {
        DOM.focusTaskName.textContent = task.title;
        DOM.focusTaskName.setAttribute('title', task.title);
        DOM.clearFocusTaskBtn.classList.remove('hidden');
        return;
      }
    }

    // Default unlinked state
    DOM.focusTaskName.textContent = 'No task selected';
    DOM.focusTaskName.removeAttribute('title');
    DOM.clearFocusTaskBtn.classList.add('hidden');
  }

  function updateDailyMetricsDisplay() {
    DOM.completedSessionsCount.textContent = dailyMetrics.completedSessions;
    DOM.totalFocusMinutes.textContent = `${dailyMetrics.totalFocusMinutes}m`;
  }

  // ==========================================================================
  // Tasks Management & Rendering
  // ==========================================================================
  function getFilteredAndSortedTasks() {
    let result = [...tasks];

    // Status filter: All, Active, Completed
    if (filterStatus === 'active') {
      result = result.filter(t => !t.completed);
    } else if (filterStatus === 'completed') {
      result = result.filter(t => t.completed);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(t => t.category.toLowerCase() === categoryFilter.toLowerCase());
    }

    // Text search filter
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const notesMatch = t.notes && t.notes.toLowerCase().includes(q);
        const catMatch = t.category.toLowerCase().includes(q);
        return titleMatch || notesMatch || catMatch;
      });
    }

    // Sorting
    result.sort((a, b) => {
      // Keep completed items at the bottom if desired or follow selected sort
      if (sortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      } else if (sortBy === 'priority') {
        const prioA = PRIORITY_ORDER[a.priority] || 0;
        const prioB = PRIORITY_ORDER[b.priority] || 0;
        return prioB - prioA;
      } else if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (sortBy === 'newest') {
        return (b.createdAt || 0) - (a.createdAt || 0);
      }
      return 0;
    });

    return result;
  }

  function renderTasks() {
    const filteredTasks = getFilteredAndSortedTasks();
    DOM.taskList.innerHTML = '';

    if (filteredTasks.length === 0) {
      DOM.emptyState.classList.remove('hidden');
      updateEmptyStateMessage();
    } else {
      DOM.emptyState.classList.add('hidden');
      const fragment = document.createDocumentFragment();

      filteredTasks.forEach(task => {
        const li = createTaskElement(task);
        fragment.appendChild(li);
      });

      DOM.taskList.appendChild(fragment);
    }

    updateBadges();
    renderMetrics();
    updateClearCompletedButton();
  }

  function updateEmptyStateMessage() {
    if (tasks.length === 0) {
      DOM.emptyStateTitle.textContent = 'No Study Tasks';
      DOM.emptyStateDesc.textContent = 'Your study planner is fresh and clean. Add your first study task to get started.';
      DOM.emptyStateAddBtn.classList.remove('hidden');
    } else if (searchQuery.trim().length > 0) {
      DOM.emptyStateTitle.textContent = 'No Matching Results';
      DOM.emptyStateDesc.textContent = `No study tasks matched "${escapeHtml(searchQuery)}". Try clearing your search or filters.`;
      DOM.emptyStateAddBtn.classList.add('hidden');
    } else if (filterStatus === 'completed') {
      DOM.emptyStateTitle.textContent = 'No Completed Tasks';
      DOM.emptyStateDesc.textContent = 'Finish a study session or check off an active task to see it here.';
      DOM.emptyStateAddBtn.classList.add('hidden');
    } else if (filterStatus === 'active') {
      DOM.emptyStateTitle.textContent = 'All Caught Up! 🎉';
      DOM.emptyStateDesc.textContent = 'You have zero active tasks remaining. Enjoy your break or create a new objective.';
      DOM.emptyStateAddBtn.classList.remove('hidden');
    } else {
      DOM.emptyStateTitle.textContent = 'No Tasks Found';
      DOM.emptyStateDesc.textContent = 'No tasks match the selected category filter.';
      DOM.emptyStateAddBtn.classList.remove('hidden');
    }
  }

  function createTaskElement(task) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    if (timer.linkedTaskId === task.id) {
      li.classList.add('active-focus-task');
    }
    li.dataset.id = task.id;

    // Due date label & styling
    const dueDateMeta = formatDueDate(task.dueDate);

    // Escape HTML strings for security
    const safeTitle = escapeHtml(task.title);
    const safeNotes = task.notes ? escapeHtml(task.notes) : '';
    const safeCategory = escapeHtml(task.category);

    li.innerHTML = `
      <div class="task-checkbox-wrap">
        <input 
          type="checkbox" 
          class="task-checkbox" 
          aria-label="Mark task '${safeTitle}' as ${task.completed ? 'incomplete' : 'complete'}" 
          ${task.completed ? 'checked' : ''}
        >
      </div>

      <div class="task-body">
        <div class="task-main-row">
          <h3 class="task-title">${safeTitle}</h3>
        </div>

        ${safeNotes ? `<p class="task-notes">${safeNotes}</p>` : ''}

        <div class="task-meta-row">
          <span class="badge badge-category">${safeCategory}</span>
          <span class="badge badge-priority-${task.priority}">${capitalize(task.priority)}</span>

          ${task.dueDate ? `
            <span class="badge badge-due-date ${dueDateMeta.cssClass}" title="Due date: ${task.dueDate}">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              <span>${dueDateMeta.label}</span>
            </span>
          ` : ''}

          <span class="badge badge-pomodoro" title="Focus sessions: completed / estimated">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span>${task.completedSessions || 0}/${task.estSessions || 1} 🍅</span>
          </span>
        </div>
      </div>

      <div class="task-actions">
        <button 
          class="btn-icon-task focus-action ${timer.linkedTaskId === task.id ? 'active' : ''}" 
          data-action="focus" 
          title="${timer.linkedTaskId === task.id ? 'Unlink from Timer' : 'Focus with Timer'}"
          aria-label="Focus with Timer"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
            <line x1="12" y1="2" x2="12" y2="4"></line>
            <line x1="12" y1="20" x2="12" y2="22"></line>
            <line x1="2" y1="12" x2="4" y2="12"></line>
            <line x1="20" y1="12" x2="22" y2="12"></line>
          </svg>
        </button>
        <button class="btn-icon-task edit-action" data-action="edit" title="Edit task" aria-label="Edit task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>
        <button class="btn-icon-task delete-action" data-action="delete" title="Delete task" aria-label="Delete task">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    `;

    return li;
  }

  function formatDueDate(dueDateString) {
    if (!dueDateString) return { label: 'No date', cssClass: '' };

    const due = new Date(dueDateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffMs = due.getTime() - today.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `${Math.abs(diffDays)}d overdue`,
        cssClass: 'due-overdue'
      };
    } else if (diffDays === 0) {
      return {
        label: 'Today',
        cssClass: 'due-today'
      };
    } else if (diffDays === 1) {
      return {
        label: 'Tomorrow',
        cssClass: 'due-today'
      };
    } else if (diffDays < 7) {
      return {
        label: `In ${diffDays} days`,
        cssClass: ''
      };
    } else {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return {
        label: `${monthNames[due.getMonth()]} ${due.getDate()}`,
        cssClass: ''
      };
    }
  }

  // ==========================================================================
  // Task Actions: Add, Edit, Delete, Toggle Complete
  // ==========================================================================
  function toggleTaskCompletion(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    task.completed = !task.completed;
    task.completedAt = task.completed ? Date.now() : null;

    saveTasks();
    renderTasks();

    if (task.completed) {
      showToast('Task marked as completed! 🎯', 'success');
      playCompletionChime();
    } else {
      showToast('Task marked as active', 'info');
    }
  }

  function openTaskModal(editingTaskId = null) {
    DOM.taskForm.reset();
    DOM.titleErrorMsg.classList.remove('visible');
    DOM.taskTitleInput.classList.remove('invalid');

    if (editingTaskId) {
      const task = tasks.find(t => t.id === editingTaskId);
      if (!task) return;

      DOM.modalTitle.textContent = 'Edit Study Task';
      DOM.saveBtnText.textContent = 'Update Task';
      DOM.taskIdInput.value = task.id;
      DOM.taskTitleInput.value = task.title;
      DOM.taskCategoryInput.value = task.category;
      DOM.taskPriorityInput.value = task.priority;
      DOM.taskDueDateInput.value = task.dueDate || '';
      DOM.taskEstSessionsInput.value = task.estSessions || 1;
      DOM.taskNotesInput.value = task.notes || '';
    } else {
      DOM.modalTitle.textContent = 'Add Study Task';
      DOM.saveBtnText.textContent = 'Create Task';
      DOM.taskIdInput.value = '';
      DOM.taskCategoryInput.value = 'Revision';
      DOM.taskPriorityInput.value = 'medium';
      DOM.taskDueDateInput.value = getRelativeDateString(1); // default tomorrow
      DOM.taskEstSessionsInput.value = 1;
      DOM.taskNotesInput.value = '';
    }

    DOM.taskModalBackdrop.classList.remove('hidden');
    setTimeout(() => DOM.taskTitleInput.focus(), 60);
  }

  function closeTaskModal() {
    DOM.taskModalBackdrop.classList.add('hidden');
    DOM.taskForm.reset();
  }

  function handleTaskFormSubmit(e) {
    e.preventDefault();

    const title = DOM.taskTitleInput.value.trim();
    if (!title) {
      DOM.taskTitleInput.classList.add('invalid');
      DOM.titleErrorMsg.classList.add('visible');
      DOM.taskTitleInput.focus();
      return;
    }

    const taskId = DOM.taskIdInput.value;
    const category = DOM.taskCategoryInput.value;
    const priority = DOM.taskPriorityInput.value;
    const dueDate = DOM.taskDueDateInput.value || null;
    const estSessions = parseInt(DOM.taskEstSessionsInput.value, 10) || 1;
    const notes = DOM.taskNotesInput.value.trim();

    if (taskId) {
      // Editing existing task
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        tasks[taskIndex] = {
          ...tasks[taskIndex],
          title,
          category,
          priority,
          dueDate,
          estSessions,
          notes
        };
        showToast('Study task updated', 'success');
      }
    } else {
      // Creating new task
      const newTask = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        title,
        category,
        priority,
        dueDate,
        estSessions,
        completedSessions: 0,
        notes,
        completed: false,
        createdAt: Date.now(),
        completedAt: null
      };
      tasks.unshift(newTask);
      showToast('New study task added', 'success');
    }

    saveTasks();
    closeTaskModal();
    renderTasks();
  }

  function deleteTask(taskId) {
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const taskTitle = tasks[taskIndex].title;
    tasks.splice(taskIndex, 1);

    // If active timer was linked to this task, unlink it
    if (timer.linkedTaskId === taskId) {
      timer.linkedTaskId = null;
      saveTimerState();
      updateLinkedTaskUI();
    }

    saveTasks();
    renderTasks();
    showToast(`Deleted "${taskTitle.substring(0, 24)}..."`, 'info');
  }

  function clearCompletedTasks() {
    const completedCount = tasks.filter(t => t.completed).length;
    if (completedCount === 0) return;

    if (!confirm(`Are you sure you want to remove all ${completedCount} completed tasks?`)) {
      return;
    }

    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    renderTasks();
    showToast(`Removed ${completedCount} completed tasks`, 'info');
  }

  function loadSampleTasks() {
    if (tasks.length > 0) {
      if (!confirm('This will load sample study tasks into your planner. Continue?')) {
        return;
      }
    }
    tasks = [...DEFAULT_SAMPLE_TASKS];
    saveTasks();
    renderTasks();
    showToast('Loaded sample study tasks', 'success');
  }

  // ==========================================================================
  // Metrics & Badges Calculation
  // ==========================================================================
  function renderMetrics() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    DOM.statTotalTasks.textContent = total;
    DOM.statActiveTasks.textContent = active;
    DOM.statCompletedTasks.textContent = completed;

    DOM.completionRateText.textContent = `${percentage}% Complete`;
    DOM.progressBarFill.style.width = `${percentage}%`;
    document.getElementById('progressBar').setAttribute('aria-valuenow', percentage);
  }

  function updateBadges() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;

    DOM.badgeAll.textContent = total;
    DOM.badgeActive.textContent = active;
    DOM.badgeCompleted.textContent = completed;
  }

  function updateClearCompletedButton() {
    const completedCount = tasks.filter(t => t.completed).length;
    DOM.clearCompletedBtn.disabled = completedCount === 0;
  }

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'danger') {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      iconSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${escapeHtml(message)}</span>`;
    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease-out';
      setTimeout(() => toast.remove(), 260);
    }, 2800);
  }

  // ==========================================================================
  // Utility Functions
  // ==========================================================================
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // ==========================================================================
  // Event Listeners
  // ==========================================================================
  function attachEventListeners() {
    // Sound Toggle
    DOM.soundToggleBtn.addEventListener('click', () => {
      settings.soundEnabled = !settings.soundEnabled;
      saveSettings();
      updateSoundIcon();
      showToast(`Sound Chime: ${settings.soundEnabled ? 'Enabled' : 'Disabled'}`, 'info');
      if (settings.soundEnabled) playCompletionChime();
    });

    // Modal Triggers
    DOM.openNewTaskBtn.addEventListener('click', () => openTaskModal(null));
    DOM.emptyStateAddBtn.addEventListener('click', () => openTaskModal(null));
    DOM.closeModalBtn.addEventListener('click', closeTaskModal);
    DOM.cancelModalBtn.addEventListener('click', closeTaskModal);
    DOM.taskForm.addEventListener('submit', handleTaskFormSubmit);

    // Modal Title validation clear on typing
    DOM.taskTitleInput.addEventListener('input', () => {
      if (DOM.taskTitleInput.value.trim().length > 0) {
        DOM.taskTitleInput.classList.remove('invalid');
        DOM.titleErrorMsg.classList.remove('visible');
      }
    });

    // Close modal on click outside backdrop
    DOM.taskModalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.taskModalBackdrop) {
        closeTaskModal();
      }
    });

    // Timer Controls
    DOM.timerToggleBtn.addEventListener('click', toggleTimer);
    DOM.timerResetBtn.addEventListener('click', resetTimer);
    DOM.clearFocusTaskBtn.addEventListener('click', unlinkFocusTask);

    // Timer Mode Tabs
    DOM.timerModeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.mode;
        setTimerMode(mode);
      });
    });

    // Task List Delegated Events (Check, Edit, Delete, Focus Link)
    DOM.taskList.addEventListener('click', (e) => {
      const taskItem = e.target.closest('.task-item');
      if (!taskItem) return;
      const taskId = taskItem.dataset.id;

      // Checkbox Toggle
      if (e.target.classList.contains('task-checkbox')) {
        toggleTaskCompletion(taskId);
        return;
      }

      // Action Buttons
      const actionBtn = e.target.closest('.btn-icon-task');
      if (actionBtn) {
        const action = actionBtn.dataset.action;
        if (action === 'edit') {
          openTaskModal(taskId);
        } else if (action === 'delete') {
          deleteTask(taskId);
        } else if (action === 'focus') {
          linkTaskToTimer(taskId);
        }
      }
    });

    // Status Filter Tabs
    DOM.statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.statusTabs.forEach(t => {
          t.classList.remove('active');
          t.setAttribute('aria-selected', 'false');
        });
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        filterStatus = tab.dataset.status;
        renderTasks();
      });
    });

    // Category Filter Dropdown
    DOM.categoryFilter.addEventListener('change', (e) => {
      categoryFilter = e.target.value;
      renderTasks();
    });

    // Sort Dropdown
    DOM.taskSortSelect.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderTasks();
    });

    // Search Input
    DOM.taskSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      DOM.clearSearchBtn.classList.toggle('hidden', searchQuery.length === 0);
      renderTasks();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.taskSearchInput.value = '';
      searchQuery = '';
      DOM.clearSearchBtn.classList.add('hidden');
      DOM.taskSearchInput.focus();
      renderTasks();
    });

    // Bulk Actions
    DOM.clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    DOM.resetSampleTasksBtn.addEventListener('click', loadSampleTasks);

    // Global Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      // Escape key closes modal
      if (e.key === 'Escape') {
        if (!DOM.taskModalBackdrop.classList.contains('hidden')) {
          closeTaskModal();
        }
        return;
      }

      // Shortcuts when not typing in an input
      if (!isInputActive) {
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          openTaskModal(null);
        } else if (e.code === 'Space') {
          e.preventDefault();
          toggleTimer();
        } else if (e.key === '/') {
          e.preventDefault();
          DOM.taskSearchInput.focus();
        }
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
