type AlertCallback = (msg: string, type?: string) => void;
type ConfirmCallback = (msg: string, type?: string) => Promise<boolean>;

let customAlert: AlertCallback = (msg) => { window.alert(msg); };
let customConfirm: ConfirmCallback = async (msg) => window.confirm(msg);

export const setAlertFunctions = (a: AlertCallback, c: ConfirmCallback) => {
  customAlert = a;
  customConfirm = c;
};

export const showAlert = (msg: string, type?: string) => customAlert(msg, type);
export const showConfirm = (msg: string, type?: string) => customConfirm(msg, type);
