"use client";

import { Children, isValidElement, useEffect, useRef, useState, type ButtonHTMLAttributes, type FormEventHandler, type ReactNode } from "react";
import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "./cn";
import styles from "./Select.module.css";

export type SelectOption = { value: string; label: string; shortLabel?: string; disabled?: boolean };
export type SelectAppearance = "default" | "embedded";
export type SelectProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "value" | "defaultValue" | "name" | "form" | "type" | "onChange" | "required"> & {
  appearance?: SelectAppearance;
  options?: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
  form?: string;
  required?: boolean;
};

const EMPTY_VALUE = "__select_empty__";
const toRadixValue = (value: string) => value === "" ? EMPTY_VALUE : `option:${value}`;
const fromRadixValue = (value: string) => value === EMPTY_VALUE ? "" : value.slice("option:".length);

export function Select(props: SelectProps) {
  const { appearance = "default", options: providedOptions, children, value, defaultValue, onValueChange, name, form, required, disabled, className, "aria-invalid": ariaInvalid, ...triggerProps } = props;
  const options: SelectOption[] = providedOptions ?? Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string; disabled?: boolean; children?: ReactNode }>(child) || child.type !== "option") return [];
    return [{ value: child.props.value ?? "", label: String(child.props.children ?? ""), disabled: child.props.disabled }];
  });
  const isControlled = value !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const selectedValue = isControlled ? value : uncontrolledValue;
  const selectedOption = options.find((option) => option.value === selectedValue);
  const initialValue = useRef(defaultValue ?? "");
  const nativeSelect = useRef<HTMLSelectElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const element = nativeSelect.current;
    const associatedForm = form ? element?.ownerDocument.getElementById(form) : element?.form;
    if (!associatedForm) return;
    const reset = () => { if (!isControlled) setUncontrolledValue(initialValue.current); };
    associatedForm.addEventListener("reset", reset);
    return () => associatedForm.removeEventListener("reset", reset);
  }, [form, isControlled]);

  const handleValueChange = (radixValue: string) => {
    const nextValue = fromRadixValue(radixValue);
    if (!isControlled) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  };

  const handleInvalid: FormEventHandler<HTMLSelectElement> = (event) => {
    event.preventDefault();
    triggerRef.current?.focus();
  };

  return (
    <>
      <RadixSelect.Root value={toRadixValue(selectedValue)} onValueChange={handleValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          {...triggerProps}
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-invalid={ariaInvalid}
          aria-required={required || triggerProps["aria-required"]}
          aria-describedby={triggerProps["aria-describedby"]}
          aria-labelledby={triggerProps["aria-labelledby"]}
          aria-label={triggerProps["aria-label"]}
          data-slot="select"
          className={cn(styles.trigger, appearance === "embedded" && styles.embedded, className)}
        >
          <RadixSelect.Value className={styles.value}>{selectedOption?.shortLabel ?? selectedOption?.label}</RadixSelect.Value>
          <ChevronDown className={styles.chevron} size={16} aria-hidden="true" />
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <div data-select-layer="" style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: "calc(max(var(--z-modal, 50), var(--z-index-modal, 50)) + 1)" }}>
          <RadixSelect.Content
            className={styles.content}
            style={{ pointerEvents: "auto" }}
            position="popper"
            sideOffset={4}
            collisionPadding={8}
          >
            <RadixSelect.Viewport className={styles.viewport}>
              {options.map((option) => (
                <RadixSelect.Item
                  key={option.value}
                  value={toRadixValue(option.value)}
                  textValue={option.label}
                  disabled={option.disabled}
                  className={styles.item}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className={styles.indicator}>
                    <Check size={16} aria-hidden="true" />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
          </div>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      <select
        ref={nativeSelect}
        className={styles.formControl}
        aria-hidden="true"
        tabIndex={-1}
        name={name}
        form={form}
        required={required}
        disabled={disabled}
        value={selectedValue}
        onChange={() => {}}
        onInvalid={handleInvalid}
      >
        {options.map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
      </select>
    </>
  );
}
