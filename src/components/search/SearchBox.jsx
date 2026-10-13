import React, { useRef } from 'react';
import { Search, X, History } from 'lucide-react';

/**
 * SearchBox Component
 * Fully accessible ARIA combobox search input with clear button, keyboard navigation,
 * and recent searches chips.
 */
const SearchBox = ({
  query,
  setQuery,
  status,
  results,
  activeIndex,
  setActiveIndex,
  onSelectUser,
  onExecuteSearch,
  onClearSearch,
  recentSearches,
  onClearRecentSearches,
}) => {
  const inputRef = useRef(null);
  const isExpanded = status.type === 'results' || status.type === 'loading' || status.type === 'empty' || status.type === 'own' || status.type === 'error';

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length > 0) {
        setActiveIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) {
        onSelectUser(results[activeIndex]);
      } else if (query.trim()) {
        onExecuteSearch(query);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClearSearch();
      if (inputRef.current) inputRef.current.blur();
    }
  };

  return (
    <div className="search-box-wrapper">
      <div className="search-input-container">
        <Search size={18} className="search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search users"
          aria-expanded={isExpanded}
          aria-controls="search-results-list"
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `result-option-${activeIndex}` : undefined}
          placeholder="Search by name, UserId or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="search-input-field"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              onClearSearch();
              if (inputRef.current) inputRef.current.focus();
            }}
            aria-label="Clear search query"
            className="search-clear-btn"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Recent Searches Row (Visible only when query is empty) */}
      {!query.trim() && recentSearches && recentSearches.length > 0 && (
        <div className="search-recents-row">
          <span className="search-recents-label">
            <History size={13} aria-hidden="true" /> Recent:
          </span>
          <div className="search-recents-chips">
            {recentSearches.map((term, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuery(term);
                  onExecuteSearch(term);
                }}
                className="search-recent-chip-btn"
              >
                {term}
              </button>
            ))}
            <button
              type="button"
              onClick={onClearRecentSearches}
              className="search-recents-clear-link"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
