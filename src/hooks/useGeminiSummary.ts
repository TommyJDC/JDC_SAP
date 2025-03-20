import { useState, useEffect } from 'react';

const GEMINI_API_KEY = 'AIzaSyAZqeCNWSWu1D4iFthrCW7sx9Ky2jlqoUg'; // Replace with your Gemini API key
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'; // Use gemini-pro model for text

const useGeminiSummary = (textToSummarize: string) => {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!textToSummarize) {
      setSummary(null);
      return;
    }

    const summarizeText = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log("Text to summarize sent to Gemini:", textToSummarize);
        console.log("Gemini API Key:", GEMINI_API_KEY);

        const prompt = `Résume ce texte: ${textToSummarize}`;
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
  }, [textToSummarize]);

  const summarizeTicket = async (text: string) => {
    try {
      const prompt = `Utilise la recherche internet pour trouver une solution au problème suivant et répond en format Markdown: ${text}`;
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
        console.error("Gemini solution error (fetch error):", response.status, response.statusText);
        return null;
      }

      const result = await response.json();

      if (result.candidates && result.candidates.length > 0) {
        const generatedSolution = result.candidates[0].content.parts[0].text;
        return generatedSolution;
      } else {
        console.error('Gemini API response unexpected:', result);
        return null;
      }
    } catch (error) {
      console.error("Gemini solution error:", error);
      return null;
    }
  };

  return { summary, isLoading, error, summarizeTicket };
};

export default useGeminiSummary;
