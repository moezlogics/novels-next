export default function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err)
    return (
      <div className="sl-alert err" role="alert">
        {err}
      </div>
    );
  if (ok)
    return (
      <div className="sl-alert ok" role="status">
        {ok}
      </div>
    );
  return null;
}

export const money = (n: number) => `Rs. ${Math.round(n || 0).toLocaleString("en-PK")}`;
