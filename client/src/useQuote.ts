import { useEffect, useState } from "react";
import { getQuote, ApiError } from "./api";
import type { QuoteResult } from "./api";

export function useQuote(net: number | null, gross: number | null, karat: number | null) {
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (net === null || gross === null || karat === null) {
      setQuote(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const q = await getQuote({ netWeightGrams: net, grossWeightGrams: gross, karat });
        if (!cancelled) {
          setQuote(q);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setQuote(null);
          setError(e instanceof ApiError ? e.message : "Could not fetch quote");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [net, gross, karat]);

  return { quote, loading, error };
}