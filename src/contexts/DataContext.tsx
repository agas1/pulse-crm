import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import type {
  Contact,
  Deal,
  Task,
  Activity,
  EmailMessage,
  TimelineEvent,
  Note,
} from '../data/types';
import { api } from '../services/api';

/* ------------------------------------------------------------------ */
/*  Context shape                                                      */
/* ------------------------------------------------------------------ */

interface DataContextValue {
  contacts: Contact[];
  deals: Deal[];
  tasks: Task[];
  activities: Activity[];
  emails: EmailMessage[];
  loading: boolean;

  addContact: (data: Omit<Contact, 'id' | 'avatar' | 'notes'>) => Promise<Contact>;
  importContacts: (rows: Omit<Contact, 'id' | 'avatar' | 'notes'>[]) => Promise<number>;
  updateContact: (id: string, data: Partial<Contact>) => Promise<void>;
  deleteContact: (id: string) => Promise<void>;
  addNote: (contactId: string, content: string, author: string) => Promise<void>;

  addDeal: (data: Omit<Deal, 'id' | 'createdAt'>) => Promise<Deal>;
  updateDeal: (id: string, data: Partial<Deal>) => Promise<void>;
  deleteDeal: (id: string) => Promise<void>;

  addTask: (data: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  addActivity: (data: Omit<Activity, 'id'>) => Promise<void>;
  getTimelineForContact: (contactId: string) => Promise<TimelineEvent[]>;

  addEmail: (data: Omit<EmailMessage, 'id'>) => Promise<EmailMessage>;
  updateEmail: (id: string, data: Partial<EmailMessage>) => Promise<void>;
  deleteEmail: (id: string) => Promise<void>;

  refreshContacts: () => Promise<void>;
  refreshDeals: () => Promise<void>;
  refreshTasks: () => Promise<void>;
  refreshActivities: () => Promise<void>;
  refreshEmails: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

export function DataProvider({ children }: { children: ReactNode }) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);

  /* ---------- initial fetch on mount ---------- */

  useEffect(() => {
    const token = localStorage.getItem('pulse-auth-token');
    if (!token) return;
    setLoading(true);
    Promise.all([
      api.get<{ contacts: Contact[] }>('/contacts'),
      api.get<{ deals: Deal[] }>('/deals'),
      api.get<{ tasks: Task[] }>('/tasks'),
      api.get<{ activities: Activity[] }>('/activities'),
      api.get<{ emails: EmailMessage[] }>('/emails'),
    ])
      .then(([c, d, t, a, e]) => {
        setContacts(c.contacts);
        setDeals(d.deals);
        setTasks(t.tasks);
        setActivities(a.activities);
        setEmails(e.emails);
      })
      .catch(() => {
        // silently fail - user may not be authenticated yet
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---------- refresh helpers ---------- */

  const refreshContacts = useCallback(async () => {
    const { contacts: list } = await api.get<{ contacts: Contact[] }>('/contacts');
    setContacts(list);
  }, []);

  const refreshDeals = useCallback(async () => {
    const { deals: list } = await api.get<{ deals: Deal[] }>('/deals');
    setDeals(list);
  }, []);

  const refreshTasks = useCallback(async () => {
    const { tasks: list } = await api.get<{ tasks: Task[] }>('/tasks');
    setTasks(list);
  }, []);

  const refreshActivities = useCallback(async () => {
    const { activities: list } = await api.get<{ activities: Activity[] }>('/activities');
    setActivities(list);
  }, []);

  const refreshEmails = useCallback(async () => {
    const { emails: list } = await api.get<{ emails: EmailMessage[] }>('/emails');
    setEmails(list);
  }, []);

  /* ================================================================ */
  /*  Contacts                                                         */
  /* ================================================================ */

  const addContact = useCallback(
    async (input: Omit<Contact, 'id' | 'avatar' | 'notes'>): Promise<Contact> => {
      const { contact } = await api.post<{ contact: Contact }>('/contacts', input);
      setContacts((prev) => [contact, ...prev]);
      return contact;
    },
    [],
  );

  const importContacts = useCallback(
    async (rows: Omit<Contact, 'id' | 'avatar' | 'notes'>[]): Promise<number> => {
      const { imported } = await api.post<{ imported: number }>('/contacts/import', { rows });
      // Refresh the full list so we get server-generated ids / avatars
      await refreshContacts();
      return imported;
    },
    [refreshContacts],
  );

  const updateContact = useCallback(
    async (id: string, patch: Partial<Contact>): Promise<void> => {
      // optimistic update
      setContacts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      );
      try {
        await api.put<{ contact: Contact }>(`/contacts/${id}`, patch);
      } catch (err) {
        // revert on failure
        await refreshContacts();
        throw err;
      }
    },
    [refreshContacts],
  );

  const deleteContact = useCallback(
    async (id: string): Promise<void> => {
      // optimistic update
      const prevContacts = contacts;
      const prevDeals = deals;
      setContacts((prev) => prev.filter((c) => c.id !== id));
      setDeals((prev) => prev.filter((d) => d.contactId !== id));
      try {
        await api.del<{ message: string }>(`/contacts/${id}`);
      } catch (err) {
        // revert on failure
        setContacts(prevContacts);
        setDeals(prevDeals);
        throw err;
      }
    },
    [contacts, deals],
  );

  const addNote = useCallback(
    async (contactId: string, content: string, author: string): Promise<void> => {
      const { note } = await api.post<{ note: Note }>(`/contacts/${contactId}/notes`, {
        content,
        author,
      });
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId ? { ...c, notes: [note, ...c.notes] } : c,
        ),
      );
    },
    [],
  );

  /* ================================================================ */
  /*  Deals                                                            */
  /* ================================================================ */

  const addDeal = useCallback(
    async (input: Omit<Deal, 'id' | 'createdAt'>): Promise<Deal> => {
      const { deal } = await api.post<{ deal: Deal }>('/deals', input);
      setDeals((prev) => [deal, ...prev]);
      return deal;
    },
    [],
  );

  const updateDeal = useCallback(
    async (id: string, patch: Partial<Deal>): Promise<void> => {
      // optimistic update
      setDeals((prev) =>
        prev.map((d) => (d.id === id ? { ...d, ...patch } : d)),
      );
      try {
        // Use the dedicated stage endpoint when stage is being changed
        if (patch.stage !== undefined) {
          await api.put<{ deal: Deal }>(`/deals/${id}/stage`, patch);
        } else {
          await api.put<{ deal: Deal }>(`/deals/${id}`, patch);
        }
      } catch (err) {
        // revert on failure
        await refreshDeals();
        throw err;
      }
    },
    [refreshDeals],
  );

  const deleteDeal = useCallback(
    async (id: string): Promise<void> => {
      const prev = deals;
      setDeals((current) => current.filter((d) => d.id !== id));
      try {
        await api.del<{ message: string }>(`/deals/${id}`);
      } catch (err) {
        setDeals(prev);
        throw err;
      }
    },
    [deals],
  );

  /* ================================================================ */
  /*  Tasks                                                            */
  /* ================================================================ */

  const addTask = useCallback(
    async (input: Omit<Task, 'id' | 'createdAt'>): Promise<Task> => {
      const { task } = await api.post<{ task: Task }>('/tasks', input);
      setTasks((prev) => [task, ...prev]);
      return task;
    },
    [],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<Task>): Promise<void> => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
      try {
        await api.put<{ task: Task }>(`/tasks/${id}`, patch);
      } catch (err) {
        await refreshTasks();
        throw err;
      }
    },
    [refreshTasks],
  );

  const deleteTask = useCallback(
    async (id: string): Promise<void> => {
      const prev = tasks;
      setTasks((current) => current.filter((t) => t.id !== id));
      try {
        await api.del<{ message: string }>(`/tasks/${id}`);
      } catch (err) {
        setTasks(prev);
        throw err;
      }
    },
    [tasks],
  );

  /* ================================================================ */
  /*  Activities                                                       */
  /* ================================================================ */

  const addActivity = useCallback(
    async (input: Omit<Activity, 'id'>): Promise<void> => {
      const { activity } = await api.post<{ activity: Activity }>('/activities', input);
      setActivities((prev) => [activity, ...prev]);
    },
    [],
  );

  /* ================================================================ */
  /*  Timeline                                                         */
  /* ================================================================ */

  const getTimelineForContact = useCallback(
    async (contactId: string): Promise<TimelineEvent[]> => {
      const { timeline } = await api.get<{ timeline: TimelineEvent[] }>(
        `/contacts/${contactId}/timeline`,
      );
      return timeline;
    },
    [],
  );

  /* ================================================================ */
  /*  Emails                                                           */
  /* ================================================================ */

  const addEmail = useCallback(
    async (input: Omit<EmailMessage, 'id'>): Promise<EmailMessage> => {
      const { email } = await api.post<{ email: EmailMessage }>('/emails', input);
      setEmails((prev) => [email, ...prev]);
      return email;
    },
    [],
  );

  const updateEmail = useCallback(
    async (id: string, patch: Partial<EmailMessage>): Promise<void> => {
      setEmails((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      );
      try {
        await api.put<{ email: EmailMessage }>(`/emails/${id}`, patch);
      } catch (err) {
        await refreshEmails();
        throw err;
      }
    },
    [refreshEmails],
  );

  const deleteEmail = useCallback(
    async (id: string): Promise<void> => {
      const prev = emails;
      setEmails((current) => current.filter((e) => e.id !== id));
      try {
        await api.del<{ message: string }>(`/emails/${id}`);
      } catch (err) {
        setEmails(prev);
        throw err;
      }
    },
    [emails],
  );

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <DataContext.Provider
      value={{
        contacts,
        deals,
        tasks,
        activities,
        emails,
        loading,

        addContact,
        importContacts,
        updateContact,
        deleteContact,
        addNote,

        addDeal,
        updateDeal,
        deleteDeal,

        addTask,
        updateTask,
        deleteTask,

        addActivity,
        getTimelineForContact,

        addEmail,
        updateEmail,
        deleteEmail,

        refreshContacts,
        refreshDeals,
        refreshTasks,
        refreshActivities,
        refreshEmails,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
