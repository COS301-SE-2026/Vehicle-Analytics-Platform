global.importMeta = { env: { VITE_MAPBOX_TOKEN: 'mock-token' } }
const { TextEncoder, TextDecoder } = require('node:util');
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

process.env.VITE_MAPBOX_TOKEN = 'mock-mapbox-token';

require('@testing-library/jest-dom');

jest.mock('radix-ui', () => {
  const React = require('react')

  const el = (tag, dataSlot) => ({ children, className, 'data-slot': _ds, ...props }) =>
    React.createElement(tag, { 'data-slot': dataSlot, className, ...props }, children)

  const div  = (slot) => el('div',    slot)
  const btn  = (slot) => el('button', slot)
  const span = (slot) => el('span',   slot)
  const img  = (slot) => ({ 'data-slot': _ds, className, ...props }) =>
    React.createElement('img', { 'data-slot': slot, className, ...props })
  const passthrough = ({ children }) => children ?? null

  return {
    Avatar: {
      Root:     div('avatar'),
      Image:    img('avatar-image'),
      Fallback: span('avatar-fallback'),
    },
    Dialog: {
      Root:        div('dialog'),
      Trigger:     btn('dialog-trigger'),
      Portal:      passthrough,
      Close:       btn('dialog-close'),
      Overlay:     div('dialog-overlay'),
      Content:     div('dialog-content'),
      Title:       ({ children, className, ...props }) =>
        React.createElement('h2', { 'data-slot': 'dialog-title', className, ...props }, children),
      Description: ({ children, className, ...props }) =>
        React.createElement('p', { 'data-slot': 'dialog-description', className, ...props }, children),
    },
    DropdownMenu: {
      Root:         div('dropdown-menu'),
      Portal:       passthrough,
      Trigger:      btn('dropdown-menu-trigger'),
      Content:      div('dropdown-menu-content'),
      Group:        div('dropdown-menu-group'),
      Item:         ({ children, className, 'data-inset': inset, 'data-variant': variant, ...props }) =>
        React.createElement('div', { 'data-slot': 'dropdown-menu-item', className, 'data-inset': inset, 'data-variant': variant, role: 'menuitem', ...props }, children),
      CheckboxItem: ({ children, className, checked, ...props }) =>
        React.createElement('div', { 'data-slot': 'dropdown-menu-checkbox-item', className, 'data-checked': checked, role: 'menuitemcheckbox', ...props }, children),
      ItemIndicator: ({ children }) => React.createElement('span', null, children),
      RadioGroup:   ({ children, ...props }) =>
        React.createElement('div', { 'data-slot': 'dropdown-menu-radio-group', role: 'group', ...props }, children),
      RadioItem:    ({ children, className, ...props }) =>
        React.createElement('div', { 'data-slot': 'dropdown-menu-radio-item', className, role: 'menuitemradio', ...props }, children),
      Label:        div('dropdown-menu-label'),
      Separator:    ({ className, ...props }) =>
        React.createElement('hr', { 'data-slot': 'dropdown-menu-separator', className, ...props }),
      Sub:          div('dropdown-menu-sub'),
      SubTrigger:   div('dropdown-menu-sub-trigger'),
      SubContent:   div('dropdown-menu-sub-content'),
    },
    Separator: {
      Root: ({ 'data-slot': _ds, className, orientation, decorative, ...props }) =>
        React.createElement('div', {
          'data-slot': 'separator',
          className,
          'data-orientation': orientation,
          'data-decorative': String(decorative),
          role: decorative ? 'none' : 'separator',
          ...props,
        }),
    },
    Slot: {
      Root: ({ children, ...props }) =>
        React.createElement('span', { 'data-testid': 'slot-root', ...props }, children),
    },
    Tooltip: {
      Provider: ({ children, delayDuration, ...props }) =>
        React.createElement('div', { 'data-slot': 'tooltip-provider', 'data-delay': delayDuration, ...props }, children),
      Root:    div('tooltip'),
      Trigger: btn('tooltip-trigger'),
      Portal:  passthrough,
      Content: ({ children, className, sideOffset, ...props }) =>
        React.createElement('div', { 'data-slot': 'tooltip-content', className, 'data-side-offset': sideOffset, ...props }, children),
      Arrow:   ({ className }) =>
        React.createElement('svg', { 'data-testid': 'tooltip-arrow', className }),
    },
  }
})