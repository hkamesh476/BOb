// Fetch predetermined codes for dropdown/autocomplete
export async function fetchPredeterminedCodes() {
  const res = await fetch('/data/predeterminedCodes.json');
  if (!res.ok) return [];
  return await res.json();
}
