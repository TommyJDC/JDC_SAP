import React from 'react';
import { Article } from '../../types'; // Import the Article type

interface ArticleSearchResultsProps {
  results: Article[];
  isLoading: boolean;
  searchPerformed: boolean; // To know if a search was attempted
}

const ArticleSearchResults: React.FC<ArticleSearchResultsProps> = ({ results, isLoading, searchPerformed }) => {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-10">
        <span className="loading loading-spinner loading-lg text-jdc-yellow"></span>
      </div>
    );
  }

  if (!searchPerformed) {
    // Updated placeholder text for the new search capability
    return <div className="text-center text-gray-500 italic mt-6">Veuillez entrer un code article ou un terme de désignation à rechercher.</div>;
  }

  if (results.length === 0) {
    // Updated placeholder text for no results
    return <div className="text-center text-gray-500 italic mt-6">Aucun article trouvé pour ce terme de recherche.</div>;
  }

  // Helper to determine badge color based on the 'category' field (from restructured data)
  const getBadgeColor = (category: string | undefined) => {
    switch (category) {
      case 'caisse': return 'badge-info';
      case 'hygiene': return 'badge-success';
      case 'securite': return 'badge-warning';
      default: return 'badge-ghost';
    }
  };

  return (
    <div className="overflow-x-auto card bg-base-100 shadow">
      <table className="table table-zebra w-full">
        {/* head */}
        <thead>
          <tr>
            <th>Code Article</th>
            <th>Désignation</th>
            <th>Catégorie</th> {/* Changed header from Source to Catégorie */}
            {/* Add other relevant headers like Prix, Stock if needed */}
            {/* <th>Prix</th> */}
            {/* <th>Stock</th> */}
          </tr>
        </thead>
        <tbody>
          {/* Ensure you use the correct field names from the UPDATED Article type */}
          {results.map((article) => (
            // Use the Firestore document ID (article.id) as the key now
            <tr key={article.id} className="hover">
              <td>
                <span className="font-mono">{article.Code}</span> {/* Use article.Code */}
              </td>
              <td>{article.Désignation}</td> {/* Use article.Désignation */}
              <td>
                {/* Use the 'category' field for the badge */}
                <span className={`badge ${getBadgeColor(article.category)} capitalize`}>
                  {article.category || 'Inconnue'} {/* Display category, fallback if missing */}
                </span>
              </td>
              {/* Render other data if available */}
              {/* <td>{article.prix ? `${article.prix.toFixed(2)} €` : '-'}</td> */}
              {/* <td>{article.stock ?? '-'}</td> */}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ArticleSearchResults;
