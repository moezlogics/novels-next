"use client";

export default function SelectAll() {
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      onChange={(e) => {
        const form = e.currentTarget.closest("form");
        form?.querySelectorAll<HTMLInputElement>("input.row-check").forEach((c) => (c.checked = e.currentTarget.checked));
      }}
    />
  );
}
