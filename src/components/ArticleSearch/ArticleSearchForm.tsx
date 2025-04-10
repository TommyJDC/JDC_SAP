import React, { useState, FormEvent } from 'react';
import { FaSearch } from 'react-icons/fa';

interface ArticleSearchFormProps {
  onSearch: (searchTerm: string) => void;
  initialSearchTerm?: string;
  isLoading: boolean;
}

const ArticleSearchForm: React.FC<ArticleSearchFormProps> = ({ onSearch, initialSearchTerm = '', isLoading }) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    // Trim the search term before submitting
    onSearch(searchTerm.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 card bg-base-100 shadow p-4">
      <input
        type="text"
        // Updated placeholder to reflect case-insensitivity for designation
        placeholder="Rechercher par Code (exact) ou Désignation (partielle, insensible à la casse)..." // Updated placeholder
        className="input input-bordered w-full"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        disabled={isLoading}
      />
      <button
        type="submit"
        className={`btn btn-primary ${isLoading ? 'loading' : ''}`}
        disabled={isLoading || !searchTerm.trim()} // Disable if loading or input is empty/whitespace
      >
        {!isLoading && <FaSearch />}
        Rechercher
      </button>
    </form>
  );
};

export default ArticleSearchForm;
