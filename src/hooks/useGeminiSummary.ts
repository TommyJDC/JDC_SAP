import { useState, useCallback } from 'react';

// Consider moving API Key to environment variables for security
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'YOUR_FALLBACK_API_KEY'; // Use Vite env var
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'; // Updated model

const useGeminiSummary = (initialPrompt: string = '') => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = useCallback(async (prompt: string) => {
    if (!prompt) {
      // console.log("[useGeminiSummary] Skipping generation: Empty prompt provided.");
      setSummary(null); // Clear summary if prompt is empty
      setError(null);
      setIsLoading(false);
      return; // Don't proceed if the prompt is empty
    }
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_FALLBACK_API_KEY') {
        console.error("[useGeminiSummary] Gemini API Key is missing or using fallback.");
        setError("Clé API Gemini manquante ou invalide.");
        setIsLoading(false);
        setSummary(null);
        return;
    }


    // console.log("[useGeminiSummary] Starting generation for prompt:", prompt);
    setIsLoading(true);
    setError(null);
    setSummary(null); // Clear previous summary before new generation

    try {
      const data = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // Optional: Add safety settings or generation config if needed
        // generationConfig: { temperature: 0.7, topP: 1.0 },
        // safetySettings: [ ... ]
      });

      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: data,
      });

      if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
            console.error("[useGeminiSummary] Gemini API Error Response:", errorData);
        } catch (e) {
            errorData = { message: response.statusText }; // Fallback if response is not JSON
        }
        const errorMessage = errorData?.error?.message || response.statusText || 'Erreur inconnue';
        setError(`Erreur API Gemini (${response.status}): ${errorMessage}`);
        setSummary(null);
        setIsLoading(false);
        return;
      }

      const result = await response.json();
      // console.log("[useGeminiSummary] Gemini API Success Response:", result);

      // Adjusted path based on typical Gemini API response structure
      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        setSummary(generatedText);
        // console.log("[useGeminiSummary] Generation successful:", generatedText);
      } else {
        console.error('[useGeminiSummary] Unexpected API response structure:', result);
        setError('Réponse inattendue de l\'API Gemini.');
        setSummary(null);
      }
    } catch (err: any) {
      console.error('[useGeminiSummary] Fetch or processing error:', err);
      setError(`Erreur lors de la génération: ${err.message}`);
      setSummary(null);
    } finally {
      setIsLoading(false);
      // console.log("[useGeminiSummary] Generation process finished.");
    }
  }, []); // No dependencies needed for useCallback if it doesn't rely on external state/props

  // Initial generation if initialPrompt is provided (optional)
  /*
  useEffect(() => {
    if (initialPrompt) {
      generateSummary(initialPrompt);
    }
    // Run only once on mount if initialPrompt exists
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);
  */
 // Instead of useEffect, we now trigger generation manually from TicketDetails

  return { summary, isLoading, error, generateSummary }; // Return the trigger function
};

export default useGeminiSummary;
