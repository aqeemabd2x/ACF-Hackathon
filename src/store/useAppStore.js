import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAppStore = create(
  persist(
    (set, get) => ({
      // ─── Navigation ───────────────────────────────────────────────
      currentPage: 'dashboard',
      setCurrentPage: (page) => set({ currentPage: page }),

      // ─── Projects ─────────────────────────────────────────────────
      projects: [],
      currentProjectId: null,

      createProject: (name) => {
        const project = {
          id: `proj_${Date.now()}`,
          name: name.trim(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          json: null,
        }
        set((s) => ({
          projects: [...s.projects, project],
          currentProjectId: project.id,
        }))
        return project
      },

      updateProject: (id, data) =>
        set((s) => ({
          projects: s.projects.map((p) =>
            p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
          ),
        })),

      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentProjectId: s.currentProjectId === id ? null : s.currentProjectId,
        })),

      setCurrentProject: (id) => set({ currentProjectId: id }),

      // ─── Working JSON ─────────────────────────────────────────────
      currentJson: null,

      setCurrentJson: (json) => {
        const { history, historyIndex } = get()
        const trimmed = history.slice(0, historyIndex + 1)
        trimmed.push(json)
        const capped = trimmed.slice(-100)
        set({
          currentJson: json,
          history: capped,
          historyIndex: capped.length - 1,
        })
      },

      // ─── Undo / Redo ──────────────────────────────────────────────
      history: [],
      historyIndex: -1,

      undo: () => {
        const { history, historyIndex } = get()
        if (historyIndex > 0) {
          const idx = historyIndex - 1
          set({ historyIndex: idx, currentJson: history[idx] })
        }
      },

      redo: () => {
        const { history, historyIndex } = get()
        if (historyIndex < history.length - 1) {
          const idx = historyIndex + 1
          set({ historyIndex: idx, currentJson: history[idx] })
        }
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // ─── Prompt History ───────────────────────────────────────────
      promptHistory: [],

      addPromptHistory: (entry) =>
        set((s) => ({
          promptHistory: [
            { ...entry, id: `ph_${Date.now()}`, timestamp: new Date().toISOString() },
            ...s.promptHistory,
          ].slice(0, 50),
        })),

      clearPromptHistory: () => set({ promptHistory: [] }),

      // ─── Right Panel ──────────────────────────────────────────────
      rightPanel: 'inspector',
      setRightPanel: (panel) => set({ rightPanel: panel }),

      // ─── Loading ──────────────────────────────────────────────────
      isLoading: false,
      loadingMessage: '',
      setLoading: (loading, message = '') =>
        set({ isLoading: loading, loadingMessage: message }),

      // ─── Settings ─────────────────────────────────────────────────
      geminiApiKey: '',
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
    }),
    {
      name: 'acf-builder-v1',
      partialize: (s) => ({
        projects: s.projects,
        currentProjectId: s.currentProjectId,
        promptHistory: s.promptHistory,
        geminiApiKey: s.geminiApiKey,
        currentJson: s.currentJson,
      }),
    }
  )
)

export default useAppStore
