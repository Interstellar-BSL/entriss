export function AdminDataUnavailableBanner({
  message = "Some data is temporarily unavailable. Showing partial results where possible.",
}: {
  message?: string;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {message}
    </div>
  );
}
