import React from 'react';

// Two icon sets run side by side:
// - 'solid' is the ligature font from @trimble-oss/modus-icons and scales with font-size.
// - the other types come from @trimble-oss/modus-icons-css and are CSS masks on a fixed 24px
//   box, so they only scale through width/height.
const MASK_TYPES = { duotone: '-duotone', fill: '-fill', regular: '' };

const ModusIcon = ({ name, type = 'duotone', size = '24px', extraClasses = '', title }) => {
  const maskSuffix = MASK_TYPES[type];

  if (maskSuffix !== undefined) {
    return (
      <i
        className={`modus-icon-${name}${maskSuffix} ${extraClasses}`.trim()}
        style={{ width: size, height: size }}
        role={title ? 'img' : undefined}
        aria-label={title}
        aria-hidden={title ? undefined : 'true'}
      />
    );
  }

  return (
    <i
      className={`modus-icons ${extraClasses}`.trim()}
      style={{ fontSize: size }}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      {name}
    </i>
  );
};

export default ModusIcon;
