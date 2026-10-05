/** A form-level error (network trouble, wrong credentials, server refusal) that is not about one field. */
export function FormAlert({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="rounded-sm border border-error/40 bg-card p-sm text-body-sm text-error-ink"
    >
      {message}
    </div>
  );
}
