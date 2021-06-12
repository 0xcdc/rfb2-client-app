import React from 'react';

function isLeftClickEvent(event) {
  return event.button === 0;
}

function isModifiedEvent(event) {
  return !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);
}

function handleClick(props, event) {
  if (props.onClick) {
    props.onClick(event);
  }

  if (isModifiedEvent(event) || !isLeftClickEvent(event)) {
    return;
  }

  if (event.defaultPrevented === true) {
    return;
  }

  event.preventDefault();
}

export default function Link(props) {
  const { to, children, ...attrs } = props;

  return (
    <a href={to} {...attrs} onClick={e => handleClick(props, e)}>
      {children}
    </a>
  );
}
