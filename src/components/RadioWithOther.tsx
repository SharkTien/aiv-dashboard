"use client";

import React, { useId } from "react";

type Option = {
  label: string;
  value: string;
};

export type RadioWithOtherProps = {
  name: string;
  label?: string;
  value: string;
  otherText?: string;
  onChange: (value: { value: string; otherText?: string }) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  options?: Option[];
  otherPlaceholder?: string;
};

const DEFAULT_OPTIONS: Option[] = [
  { label: "I have never applied before", value: "never" },
  { label: "I have applied once", value: "once" },
  { label: "I have applied twice", value: "twice" },
  { label: "I have applied three times", value: "three_times" },
  { label: "Other", value: "other" },
];

export default function RadioWithOther({
  name,
  label,
  value,
  otherText,
  onChange,
  disabled,
  required,
  className,
  options = DEFAULT_OPTIONS,
  otherPlaceholder = "Please specify",
}: RadioWithOtherProps) {
  const groupId = useId();
  const isOther = value === "other";

  return (
    <div className={className}>
      {label ? (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
          {label}
        </label>
      ) : null}

      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange({ value: opt.value })}
              disabled={disabled}
              required={required && opt.value !== "other"}
              className="h-4 w-4 text-sky-600 focus:ring-sky-500 border-gray-300"
              aria-labelledby={`${groupId}-${opt.value}`}
            />
            <span id={`${groupId}-${opt.value}`} className="text-sm text-gray-900 dark:text-white">
              {opt.label}
            </span>
          </label>
        ))}

        {isOther && (
          <div className="pl-7">
            <input
              type="text"
              value={otherText ?? ""}
              onChange={(e) => onChange({ value: "other", otherText: e.target.value })}
              placeholder={otherPlaceholder}
              disabled={disabled}
              className="mt-1 block w-full h-10 rounded-lg ring-1 ring-black/15 dark:ring-white/15 px-3 bg-white dark:bg-gray-800/50 text-slate-900 dark:text-white focus:ring-2 focus:ring-sky-500/50 transition-all"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Example usage:
// const [answer, setAnswer] = useState<{ value: string; otherText?: string }>({ value: "" });
// <RadioWithOther name="applied_times" value={answer.value} otherText={answer.otherText}
//   onChange={setAnswer} label="How many times have you applied?" />


