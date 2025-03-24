import { useState, useEffect } from 'react';

    const GEMINI_API_KEY = 'AIzaSyAZqeCNWSWu1D4iFthrCW7sx9Ky2jlqoUg'; // Replace with your Gemini API key
    const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'; // Use gemini-pro model for text

    const useGeminiSummary = (prompt: string) => {
      const [summary, setSummary] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);

      useEffect(() => {
        if (!prompt) {
          setSummary(null);
          return;
        }

        const summarizeText = async () => {
          setIsLoading(true);
          setError(null);
          try {
            console.log("Prompt sent to Gemini:", prompt);
            console.log("Gemini API Key:", GEMINI_API_KEY);

            const data = JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            });

            const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: data,
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Gemini summary error (fetch error):", errorData);
              setError(`Erreur lors de la requête: ${response.status} - ${response.statusText}`);
              setSummary(null);
              setIsLoading(false);
              return;
            }

            const result = await response.json();
            console.log("Gemini API response:", result);

            if (result.candidates && result.candidates.length > 0) {
              const generatedSummary = result.candidates[0].content.parts[0].text;
              setSummary(generatedSummary);
              console.log("Gemini summary generated successfully:", generatedSummary);
            } else {
              setError('Impossible de générer un résumé: Réponse inattendue de l\'API');
              setSummary(null);
              console.error('Gemini API response unexpected:', result);
            }
          } catch (err) {
            setError(`Erreur lors de la génération du résumé: ${err.message}`);
            setSummary(null);
            console.error('Gemini summary error:', err);
          } finally {
            setIsLoading(false);
          }
        };

        summarizeText();
      }, [prompt]);


      return { summary, isLoading, error };
    };

    export default useGeminiSummary;
