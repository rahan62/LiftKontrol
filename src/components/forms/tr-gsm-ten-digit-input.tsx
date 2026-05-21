"use client";

import { useMemo, useState } from "react";

type Props = {
  /** FormData'da gönderilen alan: yalnızca rakam, en fazla 10 karakter. Boş = cep yok. */
  name?: string;
  defaultDigits?: string;
  label: string;
  placeholder?: string;
  hint?: string;
};

export function TrGsmTenDigitInput({
  name = "primary_contact_phone_digits",
  defaultDigits = "",
  label,
  placeholder = "5XXXXXXXXX",
  hint,
}: Props) {
  const [digits, setDigits] = useState(() => defaultDigits.replace(/\D/g, "").slice(0, 10));

  const valid = useMemo(() => digits.length === 10 && /^5\d{9}$/.test(digits), [digits]);

  function applyDigits(raw: string) {
    let v = raw.replace(/\D/g, "");
    if (v.startsWith("90") && v.length >= 12) v = v.slice(2);
    if (v.startsWith("0")) v = v.slice(1);
    setDigits(v.slice(0, 10));
  }

  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300" htmlFor={`${name}-local`}>
        {label}
      </label>
      <div className="flex max-w-md items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-slate-500 focus-within:ring-1 focus-within:ring-slate-500 dark:border-slate-600 dark:bg-slate-950 dark:focus-within:border-slate-400 dark:focus-within:ring-slate-400">
        <span className="select-none text-sm font-medium text-slate-500 dark:text-slate-400" aria-hidden>
          +90
        </span>
        <input
          id={`${name}-local`}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          placeholder={placeholder}
          aria-invalid={digits.length > 0 && !valid}
          aria-describedby={hint ? `${name}-hint` : undefined}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-slate-900 shadow-none outline-none ring-0 placeholder:text-slate-400 focus:ring-0 dark:text-slate-100 dark:placeholder:text-slate-500"
          value={digits}
          onChange={(e) => applyDigits(e.target.value)}
        />
      </div>
      <input type="hidden" name={name} value={digits} />
      {hint ? (
        <p id={`${name}-hint`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
