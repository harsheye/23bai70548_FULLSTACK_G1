import React, { useEffect, useRef, useState } from 'react';
import { HiMiniChevronDown } from 'react-icons/hi2';

function FilterDropdown({ label, value, options, onSelect, triggerLabel }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const activeOption = options.find((option) => option.value === value) || options[0];
  const ActiveIcon = activeOption?.icon;

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <div className={`filter-dropdown ${open ? 'open' : ''}`} ref={containerRef}>
      <button type="button" className="filter-dropdown-trigger" onClick={() => setOpen((current) => !current)}>
        <span className="filter-dropdown-trigger-main">
          {ActiveIcon ? (
            <span className={`filter-option-icon trigger ${activeOption.colorClass || ''}`.trim()}>
              <ActiveIcon />
            </span>
          ) : null}
          <span className="filter-dropdown-copy">
            <span className="filter-dropdown-label">{triggerLabel || label}</span>
            <span className="filter-dropdown-value">{activeOption.label}</span>
          </span>
        </span>
        <HiMiniChevronDown />
      </button>
      {open && (
        <div className="filter-dropdown-menu">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                className={`filter-dropdown-option ${option.value === value ? 'active' : ''}`}
                onClick={() => {
                  onSelect(option.value);
                  setOpen(false);
                }}
              >
                <span className={`filter-option-icon ${option.colorClass || ''}`.trim()}>
                  {Icon ? <Icon /> : null}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FilterDropdown;
