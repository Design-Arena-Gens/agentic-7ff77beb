"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type ColumnId = "backlog" | "in-progress" | "blocked" | "review" | "done";
type Priority = "low" | "medium" | "high";

type Task = {
  id: string;
  title: string;
  description: string;
  status: ColumnId;
  priority: Priority;
  assignee: string;
  tags: string[];
  createdAt: string;
  dueDate?: string;
};

type ColumnConfig = {
  id: ColumnId;
  title: string;
  description: string;
  accent: string;
};

type Filters = {
  search: string;
  priority: Priority | "all";
  tag: string | "all";
  assignee: string | "all";
};

type NewTaskDraft = {
  title: string;
  description: string;
  priority: Priority;
  assignee: string;
  status: ColumnId;
  tags: string;
  dueDate: string;
};

const STORAGE_KEY = "agentic-kanban-state-v1";

const columnConfig: ColumnConfig[] = [
  {
    id: "backlog",
    title: "Backlog",
    description: "Ideas, requests, and future work",
    accent: "from-sky-50 to-sky-100 border-sky-200",
  },
  {
    id: "in-progress",
    title: "In Progress",
    description: "Actively being delivered right now",
    accent: "from-amber-50 to-amber-100 border-amber-200",
  },
  {
    id: "blocked",
    title: "Blocked",
    description: "Requires input before moving forward",
    accent: "from-rose-50 to-rose-100 border-rose-200",
  },
  {
    id: "review",
    title: "Review",
    description: "Ready for sign-off and QA",
    accent: "from-indigo-50 to-indigo-100 border-indigo-200",
  },
  {
    id: "done",
    title: "Done",
    description: "Validated, shipped, and celebrated",
    accent: "from-emerald-50 to-emerald-100 border-emerald-200",
  },
];

const demoTasks: Task[] = [
  {
    id: "T-101",
    title: "Design onboarding flow",
    description:
      "Map first-time user journey, produce low-fi wireframes, and align on success metrics.",
    status: "backlog",
    priority: "high",
    assignee: "Naomi",
    tags: ["design", "ux"],
    createdAt: "2024-04-08T09:00:00.000Z",
    dueDate: "2024-04-19",
  },
  {
    id: "T-102",
    title: "Implement auth guard",
    description:
      "Protect kanban routes and enforce token refresh logic with middleware checks.",
    status: "in-progress",
    priority: "high",
    assignee: "Jasper",
    tags: ["frontend", "next.js"],
    createdAt: "2024-04-10T10:30:00.000Z",
    dueDate: "2024-04-17",
  },
  {
    id: "T-103",
    title: "Analytics event schema",
    description:
      "Define product analytics events and document naming conventions for the team.",
    status: "blocked",
    priority: "medium",
    assignee: "Liam",
    tags: ["analytics", "growth"],
    createdAt: "2024-04-07T12:42:00.000Z",
  },
  {
    id: "T-104",
    title: "Accessibility audit",
    description:
      "Capture WCAG AA gaps and write remediation recommendations for navigation.",
    status: "review",
    priority: "medium",
    assignee: "Priya",
    tags: ["qa", "a11y"],
    createdAt: "2024-04-05T14:05:00.000Z",
    dueDate: "2024-04-16",
  },
  {
    id: "T-105",
    title: "Customer interview synthesis",
    description:
      "Summarise insights from the latest discovery interviews and highlight key opportunities.",
    status: "done",
    priority: "low",
    assignee: "Naomi",
    tags: ["research"],
    createdAt: "2024-04-02T16:20:00.000Z",
  },
  {
    id: "T-106",
    title: "Refine performance budget",
    description:
      "Document bundle targets, introduce budgets in CI, and add metrics dashboard cards.",
    status: "backlog",
    priority: "medium",
    assignee: "Rohan",
    tags: ["frontend", "ops"],
    createdAt: "2024-04-09T08:18:00.000Z",
  },
];

const priorityStyles: Record<
  Priority,
  { label: string; badge: string; ring: string }
> = {
  high: {
    label: "High",
    badge: "border-rose-200 bg-rose-50 text-rose-600",
    ring: "ring-rose-200",
  },
  medium: {
    label: "Medium",
    badge: "border-amber-200 bg-amber-50 text-amber-600",
    ring: "ring-amber-200",
  },
  low: {
    label: "Low",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-600",
    ring: "ring-emerald-200",
  },
};

const columnOrder: ColumnId[] = columnConfig.map((column) => column.id);

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2, 9)}`;

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ");

const formatDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window === "undefined") return demoTasks;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return demoTasks;
    try {
      const parsed = JSON.parse(stored) as Task[];
      if (Array.isArray(parsed) && parsed.length) {
        return parsed;
      }
    } catch {
      return demoTasks;
    }
    return demoTasks;
  });
  const [filters, setFilters] = useState<Filters>({
    search: "",
    priority: "all",
    tag: "all",
    assignee: "all",
  });
  const [newTask, setNewTask] = useState<NewTaskDraft>({
    title: "",
    description: "",
    priority: "medium",
    assignee: "",
    status: "backlog",
    tags: "",
    dueDate: "",
  });
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchTerm = filters.search.trim().toLowerCase();
      const matchesSearch =
        !searchTerm ||
        task.title.toLowerCase().includes(searchTerm) ||
        task.description.toLowerCase().includes(searchTerm) ||
        task.assignee.toLowerCase().includes(searchTerm) ||
        task.tags.some((tag) => tag.toLowerCase().includes(searchTerm));

      const matchesPriority =
        filters.priority === "all" || task.priority === filters.priority;

      const matchesTag =
        filters.tag === "all" ||
        task.tags.some(
          (tag) => tag.toLowerCase() === filters.tag.toLowerCase(),
        );

      const matchesAssignee =
        filters.assignee === "all" ||
        task.assignee.toLowerCase() === filters.assignee.toLowerCase();

      return matchesSearch && matchesPriority && matchesTag && matchesAssignee;
    });
  }, [tasks, filters]);

  const tasksByColumn = useMemo(() => {
    const map: Record<ColumnId, Task[]> = {
      backlog: [],
      "in-progress": [],
      blocked: [],
      review: [],
      done: [],
    };

    const priorityOrder: Record<Priority, number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    filteredTasks.forEach((task) => {
      map[task.status].push(task);
    });

    columnOrder.forEach((column) => {
      map[column].sort((a, b) => {
        if (a.priority === b.priority) {
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        }
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
    });

    return map;
  }, [filteredTasks]);

  const uniqueTags = useMemo(() => {
    const tags = new Set<string>();
    tasks.forEach((task) => task.tags.forEach((tag) => tags.add(tag)));
    return Array.from(tags).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const uniqueAssignees = useMemo(() => {
    const assignees = new Set<string>();
    tasks.forEach((task) => {
      if (task.assignee) assignees.add(task.assignee);
    });
    return Array.from(assignees).sort((a, b) => a.localeCompare(b));
  }, [tasks]);

  const columnStats = useMemo(() => {
    const total = tasks.length;
    return columnConfig.map((column) => {
      const count = tasks.filter((task) => task.status === column.id).length;
      const percentage =
        !total || column.id === "done"
          ? count
          : Math.round((count / total) * 100);
      return {
        id: column.id,
        title: column.title,
        count,
        percentage,
      };
    });
  }, [tasks]);

  const handleTaskDrop = (taskId: string, status: ColumnId) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status,
            }
          : task,
      ),
    );
    setDraggingId(null);
  };

  const handleMove = (taskId: string, direction: -1 | 1) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const currentIndex = columnOrder.indexOf(task.status);
        const nextIndex = currentIndex + direction;
        if (nextIndex < 0 || nextIndex >= columnOrder.length) return task;
        return {
          ...task,
          status: columnOrder[nextIndex],
        };
      }),
    );
  };

  const handlePriorityCycle = (taskId: string) => {
    const order: Priority[] = ["low", "medium", "high"];
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== taskId) return task;
        const idx = order.indexOf(task.priority);
        const nextPriority = order[(idx + 1) % order.length];
        return {
          ...task,
          priority: nextPriority,
        };
      }),
    );
  };

  const handleDelete = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const handleDuplicate = (taskId: string) => {
    setTasks((prev) => {
      const target = prev.find((task) => task.id === taskId);
      if (!target) return prev;
      const duplicate: Task = {
        ...target,
        id: createId(),
        title: `${target.title} (Copy)`,
        createdAt: new Date().toISOString(),
      };
      return [...prev, duplicate];
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newTask.title.trim()) return;

    const tags = Array.from(
      new Set(
        newTask.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
    );

    const task: Task = {
      id: createId(),
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: newTask.status,
      priority: newTask.priority,
      assignee: newTask.assignee.trim(),
      tags,
      createdAt: new Date().toISOString(),
      dueDate: newTask.dueDate || undefined,
    };

    setTasks((prev) => [...prev, task]);
    setNewTask({
      title: "",
      description: "",
      priority: "medium",
      assignee: "",
      status: "backlog",
      tags: "",
      dueDate: "",
    });
  };

  const resetBoard = () => {
    setTasks(demoTasks);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-200/60 px-6 pb-16 pt-12 sm:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10">
        <header className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Flowstate Kanban
              </p>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                Shape your team&apos;s delivery rhythm
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Prioritise work, focus on flow efficiency, and keep every task
                visible from idea to done. Drag cards between columns or use the
                quick actions to fine-tune ownership.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetBoard}
                className="h-10 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
              >
                Restore demo data
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            {columnStats.map((stat) => (
              <div
                key={stat.id}
                className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 backdrop-blur transition hover:border-slate-300 hover:shadow-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {stat.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {stat.count}
                </p>
                {stat.id === "done" ? (
                  <p className="text-xs text-emerald-600">Completed</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    {stat.percentage}% of board
                  </p>
                )}
              </div>
            ))}
          </div>
        </header>

        <section className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm backdrop-blur">
          <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-8">
            <div className="lg:col-span-2">
              <label
                htmlFor="task-title"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Title
              </label>
              <input
                id="task-title"
                type="text"
                required
                value={newTask.title}
                onChange={(event) =>
                  setNewTask((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="Add a concise task title"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="lg:col-span-3">
              <label
                htmlFor="task-description"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Description
              </label>
              <textarea
                id="task-description"
                value={newTask.description}
                onChange={(event) =>
                  setNewTask((prev) => ({
                    ...prev,
                    description: event.target.value,
                  }))
                }
                placeholder="Outline scope, links, or acceptance criteria"
                className="mt-2 h-[68px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label
                htmlFor="task-assignee"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Assignee
              </label>
              <input
                id="task-assignee"
                type="text"
                value={newTask.assignee}
                onChange={(event) =>
                  setNewTask((prev) => ({
                    ...prev,
                    assignee: event.target.value,
                  }))
                }
                placeholder="Whose court is it in?"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label
                htmlFor="task-tags"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Tags
              </label>
              <input
                id="task-tags"
                type="text"
                value={newTask.tags}
                onChange={(event) =>
                  setNewTask((prev) => ({ ...prev, tags: event.target.value }))
                }
                placeholder="Comma separated (ux, backend)"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label
                htmlFor="task-status"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Status
              </label>
              <select
                id="task-status"
                value={newTask.status}
                onChange={(event) =>
                  setNewTask((prev) => ({
                    ...prev,
                    status: event.target.value as ColumnId,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                {columnConfig.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-priority"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={newTask.priority}
                onChange={(event) =>
                  setNewTask((prev) => ({
                    ...prev,
                    priority: event.target.value as Priority,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="task-due"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Due date
              </label>
              <input
                id="task-due"
                type="date"
                value={newTask.dueDate}
                onChange={(event) =>
                  setNewTask((prev) => ({
                    ...prev,
                    dueDate: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-slate-900 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
              >
                Add task
              </button>
            </div>
          </form>

          <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
            <div className="md:col-span-2 lg:col-span-2">
              <label
                htmlFor="filter-search"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Search
              </label>
              <input
                id="filter-search"
                type="search"
                value={filters.search}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
                placeholder="Search by title, description, tags, or assignee"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              />
            </div>
            <div>
              <label
                htmlFor="filter-priority"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Priority
              </label>
              <select
                id="filter-priority"
                value={filters.priority}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    priority: event.target.value as Filters["priority"],
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="filter-tag"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Tag
              </label>
              <select
                id="filter-tag"
                value={filters.tag}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    tag: event.target.value as Filters["tag"],
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All tags</option>
                {uniqueTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="filter-assignee"
                className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Assignee
              </label>
              <select
                id="filter-assignee"
                value={filters.assignee}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    assignee: event.target.value as Filters["assignee"],
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-inner outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              >
                <option value="all">All teammates</option>
                {uniqueAssignees.map((assignee) => (
                  <option key={assignee} value={assignee}>
                    {assignee}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visible tasks
              </label>
              <div className="mt-2 flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700 shadow-inner">
                {filteredTasks.length} of {tasks.length}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
          {columnConfig.map((column) => (
            <article
              key={column.id}
              className={cn(
                "flex min-h-[420px] flex-col rounded-3xl border bg-gradient-to-br p-5 shadow-sm transition",
                column.accent,
                draggingId
                  ? "opacity-95"
                  : "hover:-translate-y-1 hover:shadow-md",
              )}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/plain");
                if (taskId) {
                  handleTaskDrop(taskId, column.id);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    {column.title}
                  </h2>
                  <p className="text-xs text-slate-600">{column.description}</p>
                </div>
                <span className="flex h-7 min-w-[28px] items-center justify-center rounded-full border border-white/70 bg-white/80 px-2 text-xs font-medium text-slate-600 shadow-sm">
                  {tasksByColumn[column.id].length}
                </span>
              </div>
              <div className="mt-4 flex flex-1 flex-col gap-3">
                {tasksByColumn[column.id].length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 px-3 py-6 text-center text-sm text-slate-500">
                    Drop a task here to start the flow
                  </div>
                ) : (
                  tasksByColumn[column.id].map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onDragStart={() => setDraggingId(task.id)}
                      onDragEnd={() => setDraggingId(null)}
                      onMoveBackward={() => handleMove(task.id, -1)}
                      onMoveForward={() => handleMove(task.id, 1)}
                      onCyclePriority={() => handlePriorityCycle(task.id)}
                      onDelete={() => handleDelete(task.id)}
                      onDuplicate={() => handleDuplicate(task.id)}
                    />
                  ))
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

type TaskCardProps = {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMoveBackward: () => void;
  onMoveForward: () => void;
  onCyclePriority: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
};

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  onMoveBackward,
  onMoveForward,
  onCyclePriority,
  onDelete,
  onDuplicate,
}: TaskCardProps) {
  const dueDateLabel = formatDate(task.dueDate);
  const createdLabel = formatDate(task.createdAt);
  const priorityStyle = priorityStyles[task.priority];

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", task.id);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-2xl border bg-white/90 px-4 py-3 shadow-sm ring-1 transition hover:-translate-y-0.5 hover:shadow-md",
        priorityStyle.ring,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-slate-900">
            {task.title}
          </h3>
          <p className="mt-1 text-xs text-slate-500">{task.id}</p>
        </div>
        <button
          type="button"
          onClick={onCyclePriority}
          className={cn(
            "rounded-full border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide transition",
            priorityStyle.badge,
            "hover:brightness-95",
          )}
        >
          {priorityStyle.label}
        </button>
      </div>

      {task.description && (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {task.description}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
        {task.assignee && (
          <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-medium text-slate-600">
            @{task.assignee}
          </span>
        )}
        {task.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex gap-3">
          {createdLabel && <span>Created {createdLabel}</span>}
          {dueDateLabel && (
            <span className="font-medium text-rose-600">
              Due {dueDateLabel}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onMoveBackward}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={task.status === columnOrder[0]}
          >
            ←
          </button>
          <button
            type="button"
            onClick={onMoveForward}
            className="rounded-full border border-slate-200 bg-white px-2 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            disabled={task.status === columnOrder[columnOrder.length - 1]}
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-3 flex gap-2 text-xs">
        <button
          type="button"
          onClick={onDuplicate}
          className="rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-transparent bg-rose-50 px-3 py-1 font-medium text-rose-600 transition hover:bg-rose-100"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
