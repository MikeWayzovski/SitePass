import React, { useMemo, useState } from 'react';
import ModusIcon from './ModusIcon';
import PersonAvatar from './PersonAvatar';
import Spinner from './Spinner';
import EmptyState from './EmptyState';
import { useI18n } from '../../i18n/context';

/**
 * Searchable list of people. Deliberately a list and not a <select>: people are picked by
 * recognising a face and an email, which a dropdown hides.
 */
const PersonPicker = ({ people, isLoading, selectedId, onSelect, emptyBody, maxHeight = '17rem' }) => {
  const { t } = useI18n();
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(needle) ||
        String(person.email || '').toLowerCase().includes(needle),
    );
  }, [people, query]);

  if (isLoading) return <Spinner label={t('loading.people')} small />;
  if (people.length === 0) return <EmptyState icon="users-three" body={emptyBody} />;

  return (
    <div>
      <div className="input-group input-group-sm mb-2">
        <span className="input-group-text bg-body">
          <ModusIcon name="magnifying-glass" size="16px" extraClasses="text-muted" />
        </span>
        <input
          type="search"
          className="form-control"
          placeholder={t('common.searchPeople')}
          aria-label={t('common.searchPeople')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="list-group list-group-flush border rounded overflow-auto" style={{ maxHeight }}>
        {matches.map((person) => {
          const isSelected = person.id === selectedId;
          return (
            <button
              key={person.id}
              type="button"
              className={`list-group-item list-group-item-action d-flex align-items-center gap-3 text-start ${
                isSelected ? 'active' : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : person)}
            >
              <PersonAvatar person={person} size={36} />
              <span className="d-flex flex-column min-w-0 flex-grow-1">
                <span className="fw-semibold text-truncate">{person.name}</span>
                <span className={`small text-truncate ${isSelected ? '' : 'text-muted'}`}>{person.email}</span>
              </span>
              {person.projectIds?.length ? (
                <span className={`badge flex-shrink-0 ${isSelected ? 'text-bg-light' : 'text-bg-secondary'}`}>
                  {t('common.project', { count: person.projectIds.length })}
                </span>
              ) : null}
            </button>
          );
        })}

        {matches.length === 0 ? (
          <div className="list-group-item text-muted small text-center py-3">{t('common.none')}</div>
        ) : null}
      </div>
    </div>
  );
};

export default PersonPicker;
