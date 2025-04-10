import React, { useState, useCallback } from 'react';
import ArticleSearchForm from '../../components/ArticleSearch/ArticleSearchForm';
import ArticleSearchResults from '../../components/ArticleSearch/ArticleSearchResults';
import { searchArticles } from '../../services/firebaseService';
import { Article } from '../../types'; // Import the Article type

const ArticleSearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchPerformed, setSearchPerformed] = useState(false); // Track if a search has been done

  const handleSearch = useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setError(null);
      setSearchPerformed(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    setSearchPerformed(true); // Mark that a search was initiated
    try {
      console.log(`[ArticleSearchPage] Searching for term: "${term}"`);
      const foundArticles = await searchArticles(term);
      console.log(`[ArticleSearchPage] Found ${foundArticles.length} articles.`);
      setResults(foundArticles);
    } catch (err: any) {
      console.error("[ArticleSearchPage] Error searching articles:", err);
      setError(`Erreur lors de la recherche: ${err.message}`);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-jdc-yellow mb-6">Recherche d'Articles</h1>

      <ArticleSearchForm
        onSearch={handleSearch}
        initialSearchTerm={searchTerm}
        isLoading={isLoading}
      />

      {error && (
        <div className="alert alert-error shadow-lg">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current flex-shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2 2m2-2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <ArticleSearchResults
        results={results}
        isLoading={isLoading}
        searchPerformed={searchPerformed}
      />
    </div>
  );
};

export default ArticleSearchPage;
