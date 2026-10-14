/**
 * The game disables Telnet echo for the club dialogue. The web client treats
 * every echo-off prompt as a password and swaps to its password input. During
 * an RKG run these are ordinary club choices, so show that same active field
 * as text and restore it as soon as the run ends.
 */
export function showClubInput(): () => void {
  if (typeof document === 'undefined') return () => {};
  const input = document.getElementById('message-input-password');
  if (typeof HTMLInputElement === 'undefined' || !(input instanceof HTMLInputElement)) return () => {};

  const originalType = input.type;
  const originalAutocomplete = input.autocomplete;
  let active = true;
  const show = () => {
    if (active && input.type !== 'text') input.type = 'text';
  };
  input.autocomplete = 'off';
  show();

  // React can reapply its static type="password" prop on a rerender.
  const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(show);
  observer?.observe(input, { attributes: true, attributeFilter: ['type'] });

  return () => {
    active = false;
    observer?.disconnect();
    input.type = originalType;
    input.autocomplete = originalAutocomplete;
  };
}
