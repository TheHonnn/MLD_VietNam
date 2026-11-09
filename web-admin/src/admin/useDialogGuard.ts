import { useCallback, useEffect, useRef, type RefObject } from 'react';

let nextFieldId = 0;
export function useDialogGuard(ref: RefObject<HTMLDialogElement>, close: () => void, readOnly: boolean, busy: boolean) {
  const touched = useRef(false);
  const baseline = useRef('');
  const submitting = useRef(false);
  const current = useRef({ close, readOnly, busy });
  current.current = { close, readOnly, busy };
  const fingerprint = () => JSON.stringify(Array.from(ref.current?.querySelectorAll('input:not([type=file]),select,textarea') || []).map(node => {
    const field = node as HTMLInputElement;
    return [field.name || field.id, field.value, field.type === 'checkbox' || field.type === 'radio' ? field.checked : null];
  }));
  const isDirty = () => !current.current.readOnly && touched.current && fingerprint() !== baseline.current;
  const requestClose = useCallback(() => {
    if (current.current.busy || submitting.current) return;
    if (isDirty() && !window.confirm('Thông tin chưa được lưu. Bạn có muốn bỏ các thay đổi và đóng biểu mẫu?')) return;
    current.current.close();
  }, []);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    baseline.current = fingerprint();
    const decorate = () => {
      for (const label of dialog.querySelectorAll('label')) {
        if (label.htmlFor || label.querySelector('input,select,textarea')) continue;
        const sibling = label.nextElementSibling;
        const field = sibling?.matches('input,select,textarea') ? sibling : sibling?.querySelector('input,select,textarea');
        if (field) { if (!field.id) field.id = 'admin-field-' + ++nextFieldId; label.htmlFor = field.id; }
      }
      const heading = dialog.querySelector('h1,h2');
      if (heading && !document.getElementById(dialog.getAttribute('aria-labelledby') || '')) {
        if (!heading.id) heading.id = 'admin-dialog-heading-' + ++nextFieldId;
        dialog.setAttribute('aria-labelledby', heading.id);
      }
      if (submitting.current && !current.current.busy && !Array.from(dialog.querySelectorAll('button')).some(button => button.disabled && /Đang (lưu|gửi|xử lý)/i.test(button.textContent || ''))) {
        submitting.current = false;
      }
    };
    const focus = () => { if (!touched.current) baseline.current = fingerprint(); };
    const input = (event: Event) => {
      touched.current = true;
      const field = event.target as HTMLInputElement;
      if (field.validity?.valid) {
        field.removeAttribute('aria-invalid');
        const errorId = field.dataset.validationError;
        if (errorId) {
          document.getElementById(errorId)?.remove();
          field.removeAttribute('aria-describedby');
          delete field.dataset.validationError;
        }
      }
    };
    const invalid = (event: Event) => {
      const field = event.target as HTMLInputElement;
      if (!field.validity || field.dataset.validationError) return;
      if (!field.id) field.id = 'admin-field-' + ++nextFieldId;
      const error = document.createElement('span');
      error.id = field.id + '-error';
      error.className = 'block text-xs text-red-700 mt-1';
      error.setAttribute('role', 'alert');
      error.textContent = field.validity.valueMissing ? 'Vui lòng nhập thông tin này.' : 'Thông tin chưa đúng định dạng hoặc giới hạn cho phép.';
      field.after(error);
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', error.id);
      field.dataset.validationError = error.id;
    };
    const submit = (event: Event) => {
      if (submitting.current) { event.preventDefault(); event.stopImmediatePropagation(); return; }
      submitting.current = true;
      queueMicrotask(decorate);
    };
    const unload = (event: BeforeUnloadEvent) => { if (isDirty()) { event.preventDefault(); event.returnValue = ''; } };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(dialog, { subtree: true, childList: true, attributes: true, attributeFilter: ['disabled'] });
    dialog.addEventListener('focusin', focus);
    dialog.addEventListener('input', input, true);
    dialog.addEventListener('change', input, true);
    dialog.addEventListener('invalid', invalid, true);
    dialog.addEventListener('submit', submit, true);
    window.addEventListener('beforeunload', unload);
    return () => {
      observer.disconnect();
      dialog.removeEventListener('focusin', focus);
      dialog.removeEventListener('input', input, true);
      dialog.removeEventListener('change', input, true);
      dialog.removeEventListener('invalid', invalid, true);
      dialog.removeEventListener('submit', submit, true);
      window.removeEventListener('beforeunload', unload);
    };
  }, []);
  return requestClose;
}
