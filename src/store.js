import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedProjects, seedTasks } from './data/seed';
import { todayKey } from './dates';

const STORAGE_KEY = 'mv3.taches.v1';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const stamp = () => Date.now();

/** Applique un horodatage de modification à une tâche. */
const touch = (obj) => ({ ...obj, updatedAt: stamp() });

export const defaultSettings = {
  voiceEnabled: true,
  defaultPriority: 2,
  defaultDue: 'none',      // none | today | tomorrow
  startScreen: 'today',    // today | plan | projects | all
  showDone: false,
  confirmDelete: true,
  photoQuality: 'medium',  // low | medium | high
  wifiOnlyUpload: false,
  syncOnStart: false,
  remindersEnabled: false,
  reminderEvening: 18,
  reminderMorning: 7,
};

const initialState = {
  loaded: false,
  tasks: [],
  projects: [],
  settings: defaultSettings,
};

function reducer(state, action) {
  switch (action.type) {
    case 'HYDRATE':
      return { ...action.payload, loaded: true };

    case 'ADD_TASK': {
      const task = {
        id: uid(),
        title: '',
        note: '',
        projectId: null,
        contact: '',
        address: '',
        priority: 2,
        done: false,
        dueDate: null,
        subtasks: [],
        attachments: [],
        createdAt: Date.now(),
        updatedAt: stamp(),
        deleted: false,
        ...action.task,
      };
      return { ...state, tasks: [task, ...state.tasks] };
    }

    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? touch({ ...t, ...action.patch }) : t
        ),
      };

    case 'DELETE_TASK':
      // Pierre tombale : la suppression doit se propager aux autres appareils.
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id ? touch({ ...t, deleted: true }) : t
        ),
      };

    case 'TOGGLE_TASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.id
            ? touch({ ...t, done: !t.done, completedAt: !t.done ? Date.now() : null })
            : t
        ),
      };

    case 'ADD_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? touch({ ...t, subtasks: [...t.subtasks, { id: uid(), title: action.title, done: false }] })
            : t
        ),
      };

    case 'TOGGLE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? touch({
                ...t,
                subtasks: t.subtasks.map((s) =>
                  s.id === action.subtaskId ? { ...s, done: !s.done } : s
                ),
              })
            : t
        ),
      };

    case 'DELETE_SUBTASK':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? touch({ ...t, subtasks: t.subtasks.filter((s) => s.id !== action.subtaskId) })
            : t
        ),
      };

    case 'ADD_ATTACHMENT':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? touch({ ...t, attachments: [...t.attachments, { id: uid(), synced: false, ...action.attachment }] })
            : t
        ),
      };

    case 'DELETE_ATTACHMENT':
      return {
        ...state,
        tasks: state.tasks.map((t) =>
          t.id === action.taskId
            ? touch({ ...t, attachments: t.attachments.filter((a) => a.id !== action.attachmentId) })
            : t
        ),
      };

    case 'ADD_PROJECT':
      return {
        ...state,
        projects: [
          ...state.projects,
          { id: uid(), type: 'autre', address: '', updatedAt: stamp(), deleted: false, ...action.project },
        ],
      };

    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? touch({ ...p, ...action.patch }) : p
        ),
      };

    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id === action.id ? touch({ ...p, deleted: true }) : p
        ),
        tasks: state.tasks.map((t) =>
          t.projectId === action.id ? touch({ ...t, projectId: null }) : t
        ),
      };

    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.patch } };

    case 'IMPORT':
      return {
        ...state,
        tasks: action.tasks,
        projects: action.projects,
      };

    case 'MERGE':
      return {
        ...state,
        tasks: action.merged.tasks,
        projects: action.merged.projects,
      };

    case 'RESET':
      return { loaded: true, settings: state.settings, tasks: seedTasks, projects: seedProjects };

    case 'CLEAR_ALL':
      return { loaded: true, settings: state.settings, tasks: [], projects: seedProjects };

    default:
      return state;
  }
}

const StoreContext = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const firstRun = useRef(true);

  // Chargement initial
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          dispatch({
            type: 'HYDRATE',
            payload: {
              tasks: parsed.tasks || [],
              projects: parsed.projects || seedProjects,
              settings: { ...defaultSettings, ...(parsed.settings || {}) },
            },
          });
        } else {
          dispatch({
            type: 'HYDRATE',
            payload: { tasks: seedTasks, projects: seedProjects, settings: defaultSettings },
          });
        }
      } catch (e) {
        dispatch({
          type: 'HYDRATE',
          payload: { tasks: seedTasks, projects: seedProjects, settings: defaultSettings },
        });
      }
    })();
  }, []);

  // Sauvegarde à chaque changement
  useEffect(() => {
    if (!state.loaded) return;
    if (firstRun.current) {
      firstRun.current = false;
    }
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ tasks: state.tasks, projects: state.projects, settings: state.settings })
    ).catch(() => {});
  }, [state.tasks, state.projects, state.settings, state.loaded]);

  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore doit être utilisé dans StoreProvider');
  return ctx;
}

/* ---------- Sélecteurs ---------- */

export function useProject(projectId) {
  const { state } = useStore();
  return state.projects.find((p) => p.id === projectId) || null;
}

export function selectToday(tasks) {
  const key = todayKey();
  return tasks.filter((t) => !t.done && t.dueDate && t.dueDate <= key);
}

export function selectPlan(tasks) {
  return tasks.filter((t) => !t.done && !t.dueDate);
}

export function selectStats(allTasks) {
  const tasks = allTasks.filter((t) => !t.deleted);
  return {
    todo: tasks.filter((t) => !t.done).length,
    waiting: tasks.filter((t) => !t.done && !t.dueDate).length,
    done: tasks.filter((t) => t.done).length,
  };
}

/**
 * Adresse à utiliser pour une tâche : la sienne si renseignée,
 * sinon celle de son chantier.
 */
export function taskAddress(task, projects) {
  if (task && task.address && task.address.trim()) {
    return { address: task.address.trim(), inherited: false };
  }
  const p = projects.find((x) => x.id === (task && task.projectId));
  if (p && p.address && p.address.trim()) {
    return { address: p.address.trim(), inherited: true };
  }
  return null;
}

export function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate) return a.dueDate < b.dueDate ? -1 : 1;
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.createdAt - a.createdAt;
  });
}
