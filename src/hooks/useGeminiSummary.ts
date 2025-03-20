import { useState, useEffect } from 'react';
import axios from 'axios';

const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // Replace with your Gemini API key
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'; // Use gemini-pro model for text

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
        console.log("Text to summarize sent to Gemini:", textToSummarize); // Log de la demande envoyée
        console.log("Gemini API Key:", GEMINI_API_KEY); // Vérification de la clé API

        const response = await axios.post(
          `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
          {
            prompt: {
              text: `Résume ce texte: ${textToSummarize}`
            }
          }
        );

        if (response.data.candidates && response.data.candidates.length > 0) {
          setSummary(response.data.candidates[0].content.parts[0].text);
          console.log("Gemini summary generated successfully:", response.data.candidates[0].content.parts[0].text); // Log du résumé réussi
        } else {
          setError('Impossible de générer un résumé: Réponse inattendue de l\'API');
          setSummary(null);
          console.error('Gemini API response unexpected:', response.data); // Log de la réponse inattendue
        }
      } catch (err) {
        setError('Erreur lors de la génération du résumé');
        setSummary(null);
        console.error('Gemini summary error:', err);
        if (err.response) {
          console.error('Gemini summary error details:', err.response.data); // Log des détails de l'erreur de réponse
        }
      } finally {
        setIsLoading(false);
      }
    };

    summarizeText();
  }, [textToSummarize]);

  const summarizeTicket = async (text: string) => {
    try {
      const response = await axios.post(
        `${GEMINI_URL}?key=${GEMINI_API_KEY}`,
        {
          prompt: {
            text: `Résume ce texte: ${text}`
          }
        }
      );
      return response.data.candidates[0]?.content.parts[0].text;
    } catch (error) {
      console.error("Gemini summary error:", error);
      return null;
    }
  };


  return { summary, isLoading, error, summarizeTicket };
};

export default useGeminiSummary;
