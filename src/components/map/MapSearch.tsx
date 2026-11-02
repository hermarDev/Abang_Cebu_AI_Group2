"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Search, X } from "lucide-react";
import { usePlaceLookup } from "@/lib/search/use-place-lookup";
import type { PlaceResult } from "@/lib/search/places";
import styles from "./MapSearch.module.css";

type MapSearchProps = {
  onSelect: (place: PlaceResult) => void;
  disabled: boolean;
  className?: string;
  embedded?: boolean;
};

export default function MapSearch({ onSelect, disabled, className, embedded = false }: MapSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const composingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { status, places, error, search, reset } = usePlaceLookup();
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelPending = () => { if (pending.current) clearTimeout(pending.current); pending.current = null; };
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);
  const scheduleSearch = (value: string) => {
    cancelPending();
    if (disabled || composingRef.current || value.trim().length < 3 || value.trim().length > 120) return;
    pending.current = setTimeout(() => { pending.current = null; setOpen(true); void search(value); }, 600);
  };
  const showOptions = open && query.trim().length >= 3 && status !== "idle";

  const runSearch = () => {
    cancelPending();
    if (disabled) return;
    setOpen(true);
    if (!composingRef.current) void search(query);
  };

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    runSearch();
  };

  const select = (place: PlaceResult) => {
    cancelPending();
    setQuery("");
    setOpen(false);
    reset();
    onSelect(place);
    inputRef.current?.focus();
  };

  const clearInput = () => {
    cancelPending();
    setQuery("");
    setOpen(false);
    setActiveIndex(-1);
    reset();
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Block keyboard shortcuts during IME composition
    if (composingRef.current || event.nativeEvent.isComposing) return;
    if (event.key === "Escape") {
      cancelPending();
      if (open) {
        setOpen(false);
        reset();
        setActiveIndex(-1);
      }
      return;
    }
    if (event.key === "ArrowDown" && places.length > 0) {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => (current < 0 ? 0 : (current + 1) % places.length));
    }
    if (event.key === "ArrowUp" && places.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current <= 0 ? places.length - 1 : current - 1));
    }
    if (event.key === "Enter" && activeIndex >= 0 && places[activeIndex]) {
      event.preventDefault();
      select(places[activeIndex]);
      return;
    }
    if (event.key === "Enter" && embedded) {
      event.preventDefault();
      runSearch();
    }
  };

  const searchControl = (
    <>
      <input
        ref={inputRef}
        className={styles.searchInput}
        type="text"
        enterKeyHint="search"
        autoComplete="off"
        role="combobox"
        aria-label="Search places"
        aria-autocomplete="list"
        aria-expanded={showOptions}
        aria-controls="place-search-results"
        aria-activedescendant={activeIndex >= 0 ? `place-option-${activeIndex}` : undefined}
        placeholder="Search places or an address"
        value={query}
        disabled={disabled}
        onCompositionStart={() => { composingRef.current = true; cancelPending(); reset(); }}
        onCompositionEnd={(event) => { composingRef.current = false; scheduleSearch(event.currentTarget.value); }}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(false);
          setActiveIndex(-1);
          reset();
          scheduleSearch(event.target.value);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {query.length > 0 && (
        <button className={styles.clearButton} type="button" aria-label="Clear search" onClick={clearInput}>
          <X size={16} aria-hidden="true" />
        </button>
      )}
      <button
        className={styles.searchButton}
        type={embedded ? "button" : "submit"}
        aria-label="Search"
        disabled={disabled || query.trim().length < 3}
        onClick={embedded ? runSearch : undefined}
      >
        <Search size={20} aria-hidden="true" />
      </button>
    </>
  );

  return (
    <div className={className ?? styles.searchRoot}>
      {embedded
        ? <div className={styles.searchForm} role="search">{searchControl}</div>
        : <form className={styles.searchForm} role="search" onSubmit={handleSearchSubmit}>{searchControl}</form>}

      {showOptions && (
        <div className={styles.resultPanel} aria-live="polite">
          {status === "loading" && <p id="place-search-results" className={styles.resultMessage} role="status">Searching places…</p>}
          {status === "error" && (
            <div id="place-search-results" className={styles.resultError} role="alert">
              <p>{error}</p>
              <button type="button" className={styles.retryButton} onClick={() => void search(query)}>Retry</button>
            </div>
          )}
          {status === "ready" && places.length === 0 && (
            <p id="place-search-results" className={styles.resultMessage} role="status">No matching places in Cebu. Try a nearby landmark.</p>
          )}
          {places.length > 0 && (
            <ul id="place-search-results" className={styles.resultList} role="listbox" aria-label="Place search results">
              {places.map((place, index) => (
                <li key={place.id} role="presentation">
                  <button
                    id={`place-option-${index}`}
                    className={styles.resultOption}
                    type="button"
                    role="option"
                    aria-selected={activeIndex === index}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => select(place)}
                  >
                    <span className={styles.placeName}>{place.name}</span>
                    <span className={styles.placeDetail}>
                      {[place.category, place.detail].filter(Boolean).join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <span className={styles.srOnly} aria-live="polite">
        {status === "ready" ? `${places.length} place results.` : ""}
      </span>
    </div>
  );
}
