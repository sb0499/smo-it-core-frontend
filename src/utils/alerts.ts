type AlertCallback = (msg: string) => void;
type ConfirmCallback = (msg: string) => Promise<boolean>;

let customAlert: AlertCallback = () => {};
let customConfirm: ConfirmCallback = async () => false;

export const setAlertFunctions = (a: AlertCallback, c: ConfirmCallback) => {
  customAlert = a;
  customConfirm = c;
};

export const showAlert = (msg: string) => customAlert(msg);
export const showConfirm = (msg: string) => customConfirm(msg);
