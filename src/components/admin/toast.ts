export type ToastTone = 'success' | 'error';

export interface ToastDetail {
  message: string;
  tone: ToastTone;
}

export const TOAST_EVENT = 'smal:toast';

/**
 * Los avisos se emiten como CustomEvent para que cualquier isla pueda
 * dispararlos sin conocer al host ni compartir estado con el.
 */
export const showToast = (message: string, tone: ToastTone = 'success') => {
  window.dispatchEvent(
    new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, tone } }),
  );
};
