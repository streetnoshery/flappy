import React from 'react';

const URL_REGEX = /(https?:\/\/[^\s<]+)/g;

/**
 * Takes a string and returns an array of React elements
 * where URLs are converted to clickable <a> tags.
 */
const Linkify = ({ children }) => {
  if (typeof children !== 'string') return children;

  const parts = children.split(URL_REGEX);

  return parts.map((part, i) =>
    URL_REGEX.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-600 hover:text-primary-700 underline underline-offset-2 break-all"
      >
        {part}
      </a>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
};

export default Linkify;
