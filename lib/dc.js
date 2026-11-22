import { useEffect, useReducer, useRef } from 'react';

// Minimal state container the ported screens are written against.
export class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = {};
  }
}

export function useDC(Logic, props) {
  const ref = useRef(null);
  const [, force] = useReducer((n) => n + 1, 0);
  if (!ref.current) {
    const c = new Logic(props || {});
    c.setState = (patch) => {
      c.state = { ...c.state, ...(typeof patch === 'function' ? patch(c.state) : patch) };
      force();
    };
    ref.current = c;
  }
  ref.current.props = props || {};
  useEffect(() => {
    const c = ref.current;
    if (c.componentDidMount) c.componentDidMount();
    return () => {
      if (c.componentWillUnmount) c.componentWillUnmount();
    };
  }, []);
  return ref.current.renderVals();
}

// Turns a "prop: value; prop: value" string into a React style object.
export function css(text) {
  const out = {};
  String(text || '')
    .split(';')
    .forEach((pair) => {
      const i = pair.indexOf(':');
      if (i < 0) return;
      const key = pair.slice(0, i).trim().replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
      if (key) out[key] = pair.slice(i + 1).trim();
    });
  return out;
}
