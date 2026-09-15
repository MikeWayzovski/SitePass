import React from 'react';
import AuthImage from './AuthImage';

const initialsOf = (person) => {
  const first = person?.firstName?.charAt(0) || '';
  const last = person?.lastName?.charAt(0) || '';
  const fallback = person?.email?.charAt(0) || '?';
  return (first + last || fallback).toUpperCase();
};

const PersonAvatar = ({ person, size = 40, className = '' }) => {
  const dimension = `${size}px`;

  const initials = (
    <span
      className={`rounded-circle bg-secondary-subtle text-secondary-emphasis fw-semibold d-inline-flex align-items-center justify-content-center flex-shrink-0 ${className}`.trim()}
      style={{ width: dimension, height: dimension, fontSize: `${Math.round(size * 0.38)}px` }}
      aria-hidden="true"
    >
      {initialsOf(person)}
    </span>
  );

  if (!person?.thumbnail) return initials;

  return (
    <AuthImage
      src={person.thumbnail}
      className={`rounded-circle border object-fit-cover flex-shrink-0 ${className}`.trim()}
      style={{ width: dimension, height: dimension }}
      fallback={initials}
    />
  );
};

export default PersonAvatar;
