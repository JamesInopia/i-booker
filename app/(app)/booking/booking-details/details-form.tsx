"use client";

import { useState } from "react";
import { saveDetails } from "../actions";
import {
  EMPTY_DRAFT,
  MAX_DESCRIPTION,
  PROGRAMS,
  hasErrors,
  validateDetails,
  type DetailsErrors,
  type Draft,
  type Nature,
} from "../rules";
import { ERROR_TEXT, FIELD, LABEL, StepForm } from "../step-form";

type Values = Pick<Draft, "contactNo" | "nature" | "natureOther" | "occupants" | "program" | "description">;

function Field({
  label,
  required,
  error,
  className = "",
  srOnlyLabel,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  srOnlyLabel?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`${LABEL} text-xs ${className}`}>
      {srOnlyLabel ? <span className="sr-only">{label}</span> : <>{label} {required && <span aria-hidden="true">*</span>}</>}
      {children}
      {error && (
        <span role="alert" className={`block font-normal ${ERROR_TEXT}`}>
          {error}
        </span>
      )}
    </label>
  );
}

export function DetailsForm({
  requestorName,
  maxCapacity,
  natures,
  initial,
}: {
  requestorName: string;
  maxCapacity: number | null;
  natures: Nature[];
  initial: Values;
}) {
  const [values, setValues] = useState<Values>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof Values, boolean>>>({});

  const errors = validateDetails({ ...EMPTY_DRAFT, ...values }, { maxCapacity, natures });
  const shown = (key: keyof DetailsErrors) => (touched[key] ? errors[key] : undefined);
  const set = (key: keyof Values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));
  const selectedNature = natures.find((n) => n.id === values.nature);
  const onNatureChange = (e: { target: { value: string } }) => {
    const next = natures.find((n) => n.id === e.target.value);
    setValues((v) => ({ ...v, nature: e.target.value, natureOther: next?.other ? v.natureOther : "" }));
  };
  const touch = (key: keyof Values) => () => setTouched((t) => ({ ...t, [key]: true }));

  return (
    <StepForm action={saveDetails} backHref="/booking/select-time" canConfirm={!hasErrors(errors)}>
      <div className="mt-6 grid gap-x-6 gap-y-4 md:grid-cols-3">
        <Field label="Requestor Name">
          <input readOnly value={requestorName} placeholder="Name" className={FIELD} />
        </Field>

        <Field label="Contact No." required error={shown("contactNo")}>
          <input
            name="contactNo"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="Contact Number"
            value={values.contactNo}
            onChange={set("contactNo")}
            onBlur={touch("contactNo")}
            className={FIELD}
          />
        </Field>

        <Field label="Nature of Activity" required error={shown("nature")}>
          <select
            name="nature"
            value={values.nature}
            onChange={onNatureChange}
            onBlur={touch("nature")}
            className={FIELD}
          >
            <option value="" disabled>
              Choose appropriate nature
            </option>
            {natures.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={maxCapacity ? `No. of Occupants (max ${maxCapacity})` : "No. of Occupants"}
          required
          error={shown("occupants")}
        >
          <input
            name="occupants"
            type="number"
            inputMode="numeric"
            min={1}
            max={maxCapacity ?? undefined}
            step={1}
            placeholder="Insert number here"
            value={values.occupants}
            onChange={set("occupants")}
            onBlur={touch("occupants")}
            className={FIELD}
          />
        </Field>

        <Field label="Program / Course" required error={shown("program")}>
          <select
            name="program"
            value={values.program}
            onChange={set("program")}
            onBlur={touch("program")}
            className={FIELD}
          >
            <option value="" disabled>
              Choose your program
            </option>
            {PROGRAMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        {selectedNature?.other && (
          <Field label="Others; please specify" required error={shown("natureOther")}>
            <input
              name="natureOther"
              maxLength={100}
              placeholder="Please specify"
              value={values.natureOther}
              onChange={set("natureOther")}
              onBlur={touch("natureOther")}
              className={FIELD}
            />
          </Field>
        )}

        <Field
          label="Description of your request"
          srOnlyLabel
          required
          error={shown("description")}
          className="md:col-span-3"
        >
          <textarea
            name="description"
            rows={6}
            maxLength={MAX_DESCRIPTION}
            placeholder="Provide any details of your booking request"
            value={values.description}
            onChange={set("description")}
            onBlur={touch("description")}
            className={`${FIELD} h-auto py-2`}
          />
          <span className="block text-right text-xs font-normal text-accent-3/70">
            {values.description.length}/{MAX_DESCRIPTION}
          </span>
        </Field>
      </div>
    </StepForm>
  );
}