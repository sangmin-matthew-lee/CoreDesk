"use client";

import { CHECKLIST_ITEMS } from "@/lib/types";

interface ChecklistPanelProps {
  checklist: Record<string, boolean>;
  onChange: (key: string, value: boolean) => void;
  disabled?: boolean;
}

export default function ChecklistPanel({ checklist, onChange, disabled }: ChecklistPanelProps) {
  const completed = CHECKLIST_ITEMS.filter((i) => checklist[i.key]).length;
  const total = CHECKLIST_ITEMS.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">
          Progress — {completed}/{total}
        </span>
        <span className="text-sm font-semibold text-indigo-600">{pct}%</span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
        {CHECKLIST_ITEMS.map((item, idx) => {
          const done = !!checklist[item.key];
          return (
            <label
              key={item.key}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors select-none ${
                done
                  ? "bg-green-50 border-green-200 text-green-800"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="checkbox"
                checked={done}
                disabled={disabled}
                onChange={(e) => onChange(item.key, e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600"
              />
              <span className="text-xs font-medium">
                <span className="text-gray-400 mr-1">{String(idx + 1).padStart(2, "0")}</span>
                {item.label}
              </span>
              {done && (
                <span className="ml-auto text-green-500 text-xs">✓</span>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}
