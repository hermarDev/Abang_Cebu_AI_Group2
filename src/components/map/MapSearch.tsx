"use client";

import { ArrowUpRight, Building2, GraduationCap, MapPin, Search, ShoppingBag, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { getCurrentSuggestions, getLandmarkSuggestions, normalize, type Landmark } from "@/lib/search/landmark-search";
import styles from "./MapSearch.module.css";

const CATEGORY_ICONS = {
  university: GraduationCap,
  business_hub: Building2,
  commercial: ShoppingBag,
} as const;

const DEBOUNCE_MS = 250;

export type SearchSelection = { landmark: Landmark } | { query: string };

type MapSearchProps = {
  onSearch: (selection: SearchSelection) => void;
};

export default function MapSearch({ onSearch }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const inputId = useId();
  const listboxId = useId();
  const searchRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = setTimeout(() => setDebouncedQuery(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const closeWhenOutside = (event: PointerEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const selectLandmark = (landmark: Landmark) => {
    setQuery(landmark.name);
    setIsOpen(false);
    setActiveIndex(-1);
    onSearch({ landmark });
  };

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentSuggestions = getCurrentSuggestions(query, debouncedQuery);
    if (activeIndex >= 0 && currentSuggestions[activeIndex]) {
      selectLandmark(currentSuggestions[activeIndex]);
      return;
    }

    const selectedLandmark = getLandmarkSuggestions(query, 1)[0];
    if (selectedLandmark && normalize(query) === normalize(selectedLandmark.shortName)) {
      selectLandmark(selectedLandmark);
      return;
    }

    const text = query.trim();
    if (!text) {
      inputRef.current?.focus();
      setIsOpen(false);
      return;
    }

    setIsOpen(false);
    setActiveIndex(-1);
    onSearch({ query: text });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const currentSuggestions = getCurrentSuggestions(query, debouncedQuery);
    if (event.key === "ArrowDown" && currentSuggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index + 1) % currentSuggestions.length);
    } else if (event.key === "ArrowUp" && currentSuggestions.length > 0) {
      event.preventDefault();
      setIsOpen(true);
      setActiveIndex((index) => (index - 1 + currentSuggestions.length) % currentSuggestions.length);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (event.key === "Enter" && activeIndex >= 0 && currentSuggestions[activeIndex]) {
      event.preventDefault();
      selectLandmark(currentSuggestions[activeIndex]);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setActiveIndex(-1);
    setIsOpen(false);
    onSearch({ query: "" });
    inputRef.current?.focus();
  };

  const currentQuery = query.trim();
  const suggestions = getCurrentSuggestions(currentQuery, debouncedQuery);
  const showPanel = isOpen && currentQuery.length >= 2 && currentQuery === debouncedQuery;
  const showNoMatch = showPanel && suggestions.length === 0;

  return (
    <section ref={searchRef} className={styles.search} aria-label="Search Cebu rentals">
      <form className={styles.form} role="search" onSubmit={submitSearch}>
        <Search aria-hidden="true" className={styles.searchIcon} size={20} />
        <label className={styles.srOnly} htmlFor={inputId}>Search rentals or landmarks in Cebu</label>
        <input
          ref={inputRef}
          id={inputId}
          className={styles.input}
          type="search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(-1);
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Search a landmark or area"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showPanel}
          aria-controls={listboxId}
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
        />
        {query && (
          <button type="button" className={styles.clearButton} onClick={clearSearch} aria-label="Clear search">
            <X size={18} aria-hidden="true" />
          </button>
        )}
        <button className={styles.submitButton} type="submit" aria-label="Search">
          <span>Search</span><ArrowUpRight size={16} aria-hidden="true" />
        </button>
      </form>

      {showPanel && (
        <div id={listboxId} className={styles.suggestions} role="listbox" aria-label="Landmark suggestions">
          {suggestions.map((landmark, index) => {
            const Icon = CATEGORY_ICONS[landmark.category];
            return (
              <button
                id={`${listboxId}-option-${index}`}
                key={landmark.id}
                type="button"
                role="option"
                aria-selected={activeIndex === index}
                className={`${styles.suggestion} ${activeIndex === index ? styles.active : ""}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => selectLandmark(landmark)}
              >
                <span className={styles.suggestionIcon}><Icon size={18} aria-hidden="true" /></span>
                <span className={styles.suggestionText}>
                  <span className={styles.suggestionName}>{landmark.name}</span>
                  <span className={styles.suggestionCategory}>{landmark.category.replaceAll("_", " ")}</span>
                </span>
                <MapPin size={16} className={styles.suggestionPin} aria-hidden="true" />
              </button>
            );
          })}
          {showNoMatch && (
            <p className={styles.noMatch} role="status">No matching landmark. Press Enter to search this area.</p>
          )}
        </div>
      )}
    </section>
  );
}
